window.App = window.App || {};

App.Utils = {
  parseNum: function (val) {
    if (val === undefined || val === null) return NaN;
    var s = String(val).trim().replace(",", ".");
    return s === "" ? NaN : +s;
  },

  isValidValue: function (val) {
    var num = this.parseNum(val);
    return !isNaN(num) && num > 0;
  },

  calcFaultDistances: function (p) {
    var isValidCoord =
      p.hypLat >= -90 &&
      p.hypLat <= 90 &&
      p.stLat >= -90 &&
      p.stLat <= 90 &&
      p.hypLon >= -180 &&
      p.hypLon <= 180 &&
      p.stLon >= -180 &&
      p.stLon <= 180 &&
      !(p.hypLat === 0 && p.hypLon === 0) &&
      !(p.stLat === 0 && p.stLon === 0) &&
      p.hypDepthKm >= 0 &&
      p.hypDepthKm <= 700 &&
      p.mw > 0 &&
      p.mw <= 10;

    if (!isValidCoord) {
      return { rRup: NaN, rJB: NaN, rW: NaN, rZ: NaN };
    }

    var clamp = function (v, min, max) {
      return Math.max(min, Math.min(max, v));
    };
    var rad = Math.PI / 180;

    var validStrike = p.strikeDeg >= 0 && p.strikeDeg <= 360 ? p.strikeDeg : 0;
    var validDip = p.dipDeg > 0 && p.dipDeg <= 90 ? p.dipDeg : 90;

    var lengthKm =
      p.lengthKm > 0 && p.lengthKm <= 1000
        ? p.lengthKm
        : Math.pow(10, -2.44 + 0.59 * p.mw);
    var widthKm =
      p.widthKm > 0 && p.widthKm <= 300
        ? p.widthKm
        : Math.pow(10, -1.01 + 0.32 * p.mw);

    var stNorth = (p.stLat - p.hypLat) * 111.132;
    var stEast = (p.stLon - p.hypLon) * 111.320 * Math.cos(p.hypLat * rad);

    var strike = validStrike * rad;
    var dip = validDip * rad;
    var usN = Math.cos(strike);
    var usE = Math.sin(strike);
    var udN = -Math.sin(strike) * Math.cos(dip);
    var udE = Math.cos(strike) * Math.cos(dip);
    var udD = Math.sin(dip);

    var sinDip = Math.max(Math.sin(dip), 1e-4);
    var offsetS = -0.5 * lengthKm;
    var offsetD;
    var p0D;

    if (p.zTorKm >= 0 && p.zTorKm <= 100) {
      p0D = p.zTorKm;
      offsetD = (p0D - p.hypDepthKm) / sinDip;
    } else {
      offsetD = Math.max(-0.5 * widthKm, -p.hypDepthKm / sinDip);
      p0D = Math.max(0, p.hypDepthKm + offsetD * udD);
    }

    var p0N = offsetS * usN + offsetD * udN;
    var p0E = offsetS * usE + offsetD * udE;

    var vN = stNorth - p0N;
    var vE = stEast - p0E;
    var vD = -p0D;

    var projS = clamp(vN * usN + vE * usE, 0, lengthKm);
    var projD = clamp(vN * udN + vE * udE + vD * udD, 0, widthKm);

    var cRupN = p0N + projS * usN + projD * udN;
    var cRupE = p0E + projS * usE + projD * udE;
    var cRupD = p0D + projD * udD;
    var rRup = Math.hypot(stNorth - cRupN, stEast - cRupE, -cRupD);

    var wHoriz = widthKm * Math.cos(dip);
    var udHorizN = -Math.sin(strike);
    var udHorizE = Math.cos(strike);
    var projSH = clamp(vN * usN + vE * usE, 0, lengthKm);
    var projDH = clamp(vN * udHorizN + vE * udHorizE, 0, wHoriz);
    var rJB = Math.hypot(
      stNorth - (p0N + projSH * usN + projDH * udHorizN),
      stEast - (p0E + projSH * usE + projDH * udHorizE)
    );

    var corners = [
      [p0N, p0E, p0D],
      [p0N + lengthKm * usN, p0E + lengthKm * usE, p0D],
      [
        p0N + lengthKm * usN + widthKm * udN,
        p0E + lengthKm * usE + widthKm * udE,
        p0D + widthKm * udD,
      ],
      [p0N + widthKm * udN, p0E + widthKm * udE, p0D + widthKm * udD],
    ];

    var rW =
      corners.reduce(function (s, c) {
        return s + Math.hypot(stNorth - c.at(0), stEast - c.at(1));
      }, 0) / 4;

    var rZ =
      corners.reduce(function (s, c) {
        return s + Math.hypot(stNorth - c.at(0), stEast - c.at(1), -c.at(2));
      }, 0) / 4;

    if (rRup > 2000 || rW > 2000 || rZ > 2000) {
      return { rRup: NaN, rJB: NaN, rW: NaN, rZ: NaN };
    }

    return { rRup: rRup, rJB: rJB, rW: rW, rZ: rZ };
  },

  countUniqueEarthquakes: function (dataArray) {
    if (!dataArray || dataArray.length === 0) return 0;

    var uniqueIds = new Set();

    dataArray.forEach(function (d) {
      var id =
        d["Earthquake ID"] ||
        d["EQID"] ||
        d["Event ID"] ||
        d["EventID"] ||
        d["ID"];

      if (id !== undefined && String(id).trim() !== "") {
        uniqueIds.add(String(id).trim());
      } else {
        var fallbackKey =
          (d["Earthquake Magnitude"] || "") +
          "_" +
          (d["Earthquake Name"] || d["Date"] || d["Year"] || "");
        uniqueIds.add(fallbackKey);
      }
    });

    return uniqueIds.size;
  },

  kernelDensityEstimator: function (kernel, X) {
    return function (V) {
      return X.map(function (x) {
        return [
          x,
          d3.mean(V, function (v) {
            return kernel(x - v);
          }),
        ];
      });
    };
  },

  kernelEpanechnikov: function (k) {
    return function (v) {
      return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
    };
  },
};
