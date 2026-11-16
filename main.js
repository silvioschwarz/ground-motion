 // ==========================================
    // 1. HAUPTDIAGRAMM (SCATTERPLOT) SETUP (Gesamthöhe: 700px)
    // ==========================================
    var margin = { top: 20, right: 90, bottom: 45, left: 70 },
      width = 960 - margin.left - margin.right,
      height = 700 - margin.top - margin.bottom;

    var svg = d3
      .select("#my_dataviz")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg
      .append("defs")
      .append("clipPath")
      .attr("id", "plot-clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height);

    // ==========================================
    // 2. SEITENDIAGRAMME SETUP (Jeweils halb so hoch: 320px + Überschrift ≈ 345px)
    // ==========================================
    var sideMargin = { top: 10, right: 25, bottom: 40, left: 55 },
      sideWidth = 500 - sideMargin.left - sideMargin.right,
      sideHeight = 320 - sideMargin.top - sideMargin.bottom; // Halb so hoch wie die Hauptgrafik

    // SVG für Histogramm (oben rechts)
    var histSvg = d3
      .select("#mag_histogram")
      .append("svg")
      .attr("width", sideWidth + sideMargin.left + sideMargin.right)
      .attr("height", sideHeight + sideMargin.top + sideMargin.bottom)
      .append("g")
      .attr(
        "transform",
        "translate(" + sideMargin.left + "," + sideMargin.top + ")",
      );

    // SVG für PGA Density Plot (unten rechts)
    var densSvg = d3
      .select("#pga_density")
      .append("svg")
      .attr("width", sideWidth + sideMargin.left + sideMargin.right)
      .attr("height", sideHeight + sideMargin.top + sideMargin.bottom)
      .append("g")
      .attr(
        "transform",
        "translate(" + sideMargin.left + "," + sideMargin.top + ")",
      );

    // Helper Funktionen
    function parseNum(val) {
      return +String(val).replace(",", ".");
    }

    function isValidValue(val) {
      var num = parseNum(val);
      return !isNaN(num) && num > 0;
    }

    // Kernel Density Estimation (KDE) Hilfsfunktionen
    function kernelDensityEstimator(kernel, X) {
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
    }

    function kernelEpanechnikov(k) {
      return function (v) {
        return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
      };
    }

    function renderDashboard(data, fileName) {
      // Alte Grafiken & Tooltips entfernen (wichtig beim Laden einer neuen Datei)
      d3.select("#my_dataviz").selectAll("*").remove();
      d3.select("#mag_histogram").selectAll("svg").remove();
      d3.select("#pga_density").selectAll("svg").remove();

      const validData = data.filter(
        d => isValidValue(d["PGA (g)"]) && parseNum(d["PGA (g)"]) > 0
      );

      if (validData.length === 0) {
        d3.select("#file-status")
          .style("color", "red")
          .text("Fehler: Keine gültigen Daten (Spalte 'PGA (g)' > 0) in '" + fileName + "' gefunden.");
        return;
      }

      d3.select("#file-status")
        .style("color", "green")
        .text("Geladen: " + fileName + " (" + validData.length.toLocaleString("de-DE") + " gültige Zeilen)");

      // SVGs neu aufbauen
      var svg = d3.select("#my_dataviz")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      svg.append("defs").append("clipPath")
        .attr("id", "plot-clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

      var histSvg = d3.select("#mag_histogram")
        .append("svg")
        .attr("width", sideWidth + sideMargin.left + sideMargin.right)
        .attr("height", sideHeight + sideMargin.top + sideMargin.bottom)
        .append("g")
        .attr("transform", "translate(" + sideMargin.left + "," + sideMargin.top + ")");

      var densSvg = d3.select("#pga_density")
        .append("svg")
        .attr("width", sideWidth + sideMargin.left + sideMargin.right)
        .attr("height", sideHeight + sideMargin.top + sideMargin.bottom)
        .append("g")
        .attr("transform", "translate(" + sideMargin.left + "," + sideMargin.top + ")");

      // Controls beim Neuladen auf Default zurücksetzen
      d3.select("#log-x-checkbox").property("checked", true);
      d3.select("#log-y-checkbox").property("checked", true);
      d3.select("#trendline-checkbox").property("checked", true);
      d3.select("input[name='distance'][value='HypD (km)']").property("checked", true);

      // Min und Max Magnitude ermitteln
      var magExtent = d3.extent(validData, function (d) {
        var m = parseNum(d["Earthquake Magnitude"]);
        return !isNaN(m) ? m : undefined;
      });

      var dataMinMag = 3;
      var dataMaxMag = 8;

      var currentMetric = "HypD (km)";
      var isLogX = true;
      var isLogY = true;
      var showTrendline = true;
      var minMagnitude = dataMinMag;

      d3.select("#mag-slider")
        .attr("min", dataMinMag)
        .attr("max", dataMaxMag)
        .property("value", dataMinMag);

      d3.select("#mag-value").text(dataMinMag.toFixed(1));

      // Skalen & Gruppen
      var x = d3.scaleLog().domain([0.0001, 2000]).range([0, width]);
      var y = d3.scaleLog().domain([0.0000001, 5]).range([height, 0]);

      var xGridGroup = svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(0," + height + ")");

      var yGridGroup = svg.append("g")
        .attr("class", "grid");

      var xAxisGroup = svg.append("g")
        .attr("transform", "translate(0," + height + ")");

      var yAxisGroup = svg.append("g");

      // Farbskala
      const colorScale = d3.scaleLinear()
        .domain([dataMinMag, (dataMinMag + dataMaxMag) / 2, dataMaxMag])
        .range(["green", "yellow", "red"])
        .clamp(true);

      // ==========================================
      // COLOR BAR LEGEND
      // ==========================================
      var legendWidth = 20;
      var legendHeight = 200;
      var legendX = width + 20;
      var legendY = 20;

      var defs = svg.select("defs");
      var linearGradient = defs.append("linearGradient")
        .attr("id", "magnitude-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

      var domain = colorScale.domain();
      var range = colorScale.range();
      var minVal = domain[0];
      var maxVal = domain[domain.length - 1];

      linearGradient.selectAll("stop")
        .data(domain.map(function (d, i) {
          return {
            offset: ((d - minVal) / (maxVal - minVal) * 100) + "%",
            color: range[i]
          };
        }))
        .enter().append("stop")
        .attr("offset", function (d) { return d.offset; })
        .attr("stop-color", function (d) { return d.color; });

      var legendGroup = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(" + legendX + "," + legendY + ")");

      legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#magnitude-gradient)")
        .style("stroke", "#ccc")
        .style("stroke-width", "1px");

      var legendScale = d3.scaleLinear()
        .domain([minVal, maxVal])
        .range([legendHeight, 0]);

      legendGroup.append("g")
        .attr("transform", "translate(" + legendWidth + ", 0)")
        .call(d3.axisRight(legendScale).ticks(5));

      legendGroup.append("text")
        .attr("x", 0)
        .attr("y", -8)
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Magnitude");

      // ==========================================
      // TOOLTIP & PUNKTE
      // ==========================================
      var tooltip = d3.select("#my_dataviz")
        .append("div")
        .style("opacity", 0)
        .style("position", "absolute")
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("pointer-events", "none");

      function isDotVisible(d) {
        var mag = parseNum(d["Earthquake Magnitude"]);
        return isValidValue(d[currentMetric]) && !isNaN(mag) && mag >= minMagnitude;
      }

      function updateVisibleCounter() {
        var visibleCount = validData.filter(isDotVisible).length;
        var totalValidForMetric = validData.filter(function (d) {
          return isValidValue(d[currentMetric]);
        }).length;

        d3.select("#visible-count").text(
          "(Angezeigt: " + visibleCount.toLocaleString("de-DE") +
          " von " + totalValidForMetric.toLocaleString("de-DE") + " Beben)"
        );
      }

      var mouseover = function (d) { tooltip.style("opacity", 1); };
      var mousemove = function (d) {
        var coords = d3.mouse(this);
        tooltip
          .html(
            "Magnitude: " + d["Earthquake Magnitude"] + "<br>" +
            currentMetric + ": " + d[currentMetric] + "<br>" +
            "PGA (g): " + d["PGA (g)"]
          )
          .style("left", (coords + 90) + "px")
          .style("top", (coords) + "px");
      };
      var mouseleave = function (d) { tooltip.transition().duration(200).style("opacity", 0); };

      var dots = svg.append('g')
        .selectAll("circle")
        .data(validData)
        .enter()
        .append("circle")
        .attr("cx", function (d) { return isValidValue(d[currentMetric]) ? x(parseNum(d[currentMetric])) : 0; })
        .attr("cy", function (d) { return y(parseNum(d["PGA (g)"])); })
        .attr("r", 3)
        .style("opacity", function (d) { return isDotVisible(d) ? 1 : 0; })
        .style("pointer-events", function (d) { return isDotVisible(d) ? "all" : "none"; })
        .style("fill", function (d) { return colorScale(parseNum(d["Earthquake Magnitude"])); })
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave);

      var trendlinePath = svg.append("path")
        .attr("class", "trendline")
        .attr("clip-path", "url(#plot-clip)")
        .style("fill", "none")
        .style("stroke", "#0056b3")
        .style("stroke-width", "3px")
        .style("stroke-dasharray", "8,4")
        .style("pointer-events", "none");

      var xLabel = svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width)
        .attr("y", height + margin.top + 20)
        .text(currentMetric);

      svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -margin.top)
        .text("PGA (g)");

      // ==========================================
      // HISTOGRAMM
      // ==========================================
      var histStart = Math.floor(dataMinMag);
      var histEnd = 9.5;
      var histThresholds = d3.range(histStart, histEnd, 0.5);

      var histX = d3.scaleLinear()
        .domain([histStart, histEnd])
        .range([0, sideWidth]);

      var histY = d3.scaleLinear()
        .range([sideHeight, 0]);

      histSvg.append("g")
        .attr("transform", "translate(0," + sideHeight + ")")
        .call(d3.axisBottom(histX).tickValues(d3.range(histStart, histEnd + 0.5, 0.5)));

      var histYAxisGroup = histSvg.append("g");

      histSvg.append("text")
        .attr("text-anchor", "end")
        .attr("x", sideWidth)
        .attr("y", sideHeight + 34)
        .style("font-size", "12px")
        .text("Magnitude");

      histSvg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -sideMargin.left + 15)
        .attr("x", -5)
        .style("font-size", "12px")
        .text("Anzahl");

      function updateHistogram(animate) {
        var visiblePoints = validData.filter(isDotVisible);

        var histogram = d3.histogram()
          .value(function (d) { return parseNum(d["Earthquake Magnitude"]); })
          .domain(histX.domain())
          .thresholds(histThresholds);

        var bins = histogram(visiblePoints);
        var maxFreq = d3.max(bins, function (d) { return d.length; }) || 10;
        histY.domain([0, maxFreq]).nice();

        if (animate) {
          histYAxisGroup.transition().duration(300).call(d3.axisLeft(histY).ticks(5));
        } else {
          histYAxisGroup.call(d3.axisLeft(histY).ticks(5));
        }

        var bars = histSvg.selectAll("rect.bar").data(bins);
        var barsMerged = bars.enter()
          .append("rect")
          .attr("class", "bar")
          .style("stroke", "#444")
          .style("stroke-width", "0.5px")
          .merge(bars);

        (animate ? barsMerged.transition().duration(300) : barsMerged)
          .attr("x", function (d) { return histX(d.x0) + 1; })
          .attr("width", function (d) { return Math.max(0, histX(d.x1) - histX(d.x0) - 2); })
          .attr("y", function (d) { return histY(d.length); })
          .attr("height", function (d) { return sideHeight - histY(d.length); })
          .style("fill", function (d) { return colorScale((d.x0 + d.x1) / 2); });
        bars.exit().remove();
        var labels = histSvg.selectAll("text.bar-label").data(bins);
        var labelsMerged = labels.enter()
          .append("text")
          .attr("class", "bar-label")
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", "#333")
          .merge(labels);
        (animate ? labelsMerged.transition().duration(300) : labelsMerged)
          .attr("x", function (d) { return histX(d.x0) + (histX(d.x1) - histX(d.x0)) / 2; })
          .attr("y", function (d) { return histY(d.length) - 3; })
          .text(function (d) { return d.length > 0 ? d.length : ""; });
        labels.exit().remove();
      }
      // ==========================================
      // PGA DENSITY PLOT (Wissenschaftliche Notation)
      // ==========================================
      var densXAxisGroup = densSvg.append("g")
        .attr("transform", "translate(0," + sideHeight + ")");
      var densYAxisGroup = densSvg.append("g");
      var densPath = densSvg.append("path")
        .style("fill", "#69b3a2")
        .style("fill-opacity", 0.5)
        .style("stroke", "#2e6b5e")
        .style("stroke-width", "2px");
      densSvg.append("text")
        .attr("text-anchor", "end")
        .attr("x", sideWidth)
        .attr("y", sideHeight + 34)
        .style("font-size", "12px")
        .text("PGA (g)");
      densSvg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -sideMargin.left + 15)
        .attr("x", -5)
        .style("font-size", "12px")
        .text("Dichte");

      function updateDensityPlot(animate) {
        var visiblePoints = validData.filter(isDotVisible);
        var densX, densXAxisGen, values, bandwidth, ticksForKde;

        var maxY = d3.max(validData, function (d) {
          return parseNum(d["PGA (g)"]);
        }) || 5;

        if (isLogY) {
          densX = d3.scaleLog().domain([0.0000001, 5]).range([0, sideWidth]).nice();
          densXAxisGen = d3.axisBottom(densX).ticks(6, ".0e");

          values = visiblePoints.map(function (d) { return Math.log10(parseNum(d["PGA (g)"])); });
          var logDom = [Math.log10(densX.domain()[0]), Math.log10(densX.domain()[1])];
          ticksForKde = d3.range(logDom[0], logDom[1], (logDom[1] - logDom[0]) / 80);
          bandwidth = 0.25;
        } else {
          densX = d3.scaleLinear().domain([0, maxY]).range([0, sideWidth]).nice();
          densXAxisGen = d3.axisBottom(densX).ticks(6, ".1e");

          values = visiblePoints.map(function (d) { return parseNum(d["PGA (g)"]); });
          var linDom = densX.domain();
          ticksForKde = d3.range(linDom[0], linDom[1], (linDom[1] - linDom[0]) / 80);
          bandwidth = (linDom[1] - linDom[0]) / 25;
        }

        var density = [];
        if (values.length > 0) {
          var kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), ticksForKde);
          density = kde(values);
        }

        var maxDens = d3.max(density, function (d) { return d[1]; }) || 1;
        var densY = d3.scaleLinear()
          .domain([0, maxDens * 1.1])
          .range([sideHeight, 0]);

        if (animate) {
          densXAxisGroup.transition().duration(300).call(densXAxisGen);
          densYAxisGroup.transition().duration(300).call(d3.axisLeft(densY).ticks(5));
        } else {
          densXAxisGroup.call(densXAxisGen);
          densYAxisGroup.call(d3.axisLeft(densY).ticks(5));
        }

        var areaGen = d3.area()
          .curve(d3.curveBasis)
          .x(function (d) {
            var val = isLogY ? Math.pow(10, d[0]) : d[0];
            return densX(val);
          })
          .y0(sideHeight)
          .y1(function (d) { return densY(d[1]); });

        if (density.length === 0) {
          densPath.attr("d", null);
        } else if (animate) {
          densPath.datum(density).transition().duration(300).attr("d", areaGen);
        } else {
          densPath.datum(density).attr("d", areaGen);
        }
      }

      // ==========================================
      // TRENDLINIE BERECHNUNG
      // ==========================================
      function updateTrendline(animate) {
        if (!showTrendline) {
          trendlinePath.style("opacity", 0);
          d3.select("#trendline-stats").text("");
          return;
        }
        var visiblePoints = validData.filter(isDotVisible);
        if (visiblePoints.length < 2) {
          trendlinePath.style("opacity", 0);
          d3.select("#trendline-stats").text("(Zu wenige Punkte für Trendlinie)");
          return;
        }
        var n = 0, sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
        var minRawX = Infinity, maxRawX = -Infinity;
        visiblePoints.forEach(function (d) {
          var rawX = parseNum(d[currentMetric]);
          var rawY = parseNum(d["PGA (g)"]);
          if (rawX < minRawX) minRawX = rawX;
          if (rawX > maxRawX) maxRawX = rawX;
          var tx = isLogX ? Math.log10(rawX) : rawX;
          var ty = isLogY ? Math.log10(rawY) : rawY;
          sumX += tx;
          sumY += ty;
          sumXY += tx * ty;
          sumXX += tx * tx;
          sumYY += ty * ty;
          n++;
        });
        var denominator = (n * sumXX - sumX * sumX);
        if (denominator === 0) return;
        var slope = (n * sumXY - sumX * sumY) / denominator;
        var intercept = (sumY - slope * sumX) / n;
        var rNum = (n * sumXY - sumX * sumY);
        var rDen = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        var rSquared = rDen !== 0 ? Math.pow(rNum / rDen, 2) : 0;
        var xValues = [minRawX, maxRawX];
        var linePoints = xValues.map(function (rx) {
          var tx = isLogX ? Math.log10(rx) : rx;
          var ty = slope * tx + intercept;
          var ry = isLogY ? Math.pow(10, ty) : ty;
          return [x(rx), y(ry)];
        });
        var lineGen = d3.line();
        if (animate) {
          trendlinePath.transition().duration(750)
            .style("opacity", 1)
            .attr("d", lineGen(linePoints));
        } else {
          trendlinePath
            .style("opacity", 1)
            .attr("d", lineGen(linePoints));
        }
        d3.select("#trendline-stats").text(
          "(Steigung: " + slope.toFixed(2) + " | R² = " + rSquared.toFixed(3) + ")"
        );
      }
      // ==========================================
      // HAUPT-UPDATE FUNKTION
      // ==========================================
      function updatePlot(isInitialLoad) {
        var dur = isInitialLoad ? 0 : 750;
        var maxX = d3.max(validData, function (d) {
          return isValidValue(d[currentMetric]) ? parseNum(d[currentMetric]) : undefined;
        }) || 2000;
        var maxY = d3.max(validData, function (d) {
          return parseNum(d["PGA (g)"]);
        }) || 5;
        var xAxisGen;
        if (isLogX) {
          x = d3.scaleLog().domain([0.0001, 2000]).range([0, width]).nice();
          xAxisGen = d3.axisBottom(x).ticks(8, ",g");
        } else {
          x = d3.scaleLinear().domain([0, maxX]).range([0, width]).nice();
          xAxisGen = d3.axisBottom(x).ticks(10);
        }
        var yAxisGen;
        if (isLogY) {
          y = d3.scaleLog().domain([0.0000001, 5]).range([height, 0]).nice();
          yAxisGen = d3.axisLeft(y).ticks(8, ",g");
        } else {
          y = d3.scaleLinear().domain([0, maxY]).range([height, 0]).nice();
          yAxisGen = d3.axisLeft(y).ticks(10);
        }
        xAxisGroup.transition().duration(dur).call(xAxisGen);
        yAxisGroup.transition().duration(dur).call(yAxisGen);
        xGridGroup.transition().duration(dur)
          .call(d3.axisBottom(x)
            .ticks(isLogX ? 8 : 10)
            .tickSize(-height)
            .tickFormat("")
          );
        yGridGroup.transition().duration(dur)
          .call(d3.axisLeft(y)
            .ticks(isLogY ? 8 : 10)
            .tickSize(-width)
            .tickFormat("")
          );
        xLabel.text(currentMetric);
        updateVisibleCounter();
        updateTrendline(!isInitialLoad);
        updateHistogram(!isInitialLoad);
        updateDensityPlot(!isInitialLoad);
        dots.transition()
          .duration(dur)
          .attr("cx", function (d) {
            return isValidValue(d[currentMetric]) ? x(parseNum(d[currentMetric])) : 0;
          })
          .attr("cy", function (d) {
            return y(parseNum(d["PGA (g)"]));
          })
          .style("opacity", function (d) {
            return isDotVisible(d) ? 1 : 0;
          })
          .style("pointer-events", function (d) {
            return isDotVisible(d) ? "all" : "none";
          });
      }
      function filterByMagnitude() {
        dots
          .style("opacity", function (d) { return isDotVisible(d) ? 1 : 0; })
          .style("pointer-events", function (d) { return isDotVisible(d) ? "all" : "none"; });
        updateVisibleCounter();
        updateTrendline(false);
        updateHistogram(false);
        updateDensityPlot(false);
      }
      // Event-Listener (vorherige Listener mit null bereinigen)
      d3.select("#mag-slider").on("input", null).on("input", function () {
        minMagnitude = +this.value;
        d3.select("#mag-value").text(minMagnitude.toFixed(1));
        filterByMagnitude();
      });
      d3.selectAll("input[name='distance']").on("change", null).on("change", function () {
        currentMetric = this.value;
        updatePlot(false);
      });
      d3.select("#log-x-checkbox").on("change", null).on("change", function () {
        isLogX = this.checked;
        updatePlot(false);
      });
      d3.select("#log-y-checkbox").on("change", null).on("change", function () {
        isLogY = this.checked;
        updatePlot(false);
      });
      d3.select("#trendline-checkbox").on("change", null).on("change", function () {
        showTrendline = this.checked;
        updateTrendline(false);
      });
      // Sofortiges Initialisieren aller Grafiken
      updatePlot(true);
    }

    // 1. Event-Listener für lokalen Datei-Upload
    d3.select("#csv-file-input").on("change", function () {
      var file = this.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function (event) {
        var csvText = event.target.result;
        // Erkennt automatisch Komma- oder Semikolon-getrennte CSVs
        var firstLine = csvText.split("\n")[0];
        var parsedData = firstLine.indexOf(";") !== -1 && firstLine.indexOf(",") === -1
          ? d3.dsvFormat(";").parse(csvText)
          : d3.csvParse(csvText);

        renderDashboard(parsedData, file.name);
      };
      reader.readAsText(file);
    });

    // 2. Automatischer Start-Versuch (falls Server läuft)
    d3.csv("/NGA_West2.csv", function (error, data) {
      if (error || !data) {
        d3.select("#file-status")
          .style("color", "#d9534f")
          .text("Keine Server-Datei gefunden. Bitte wählen Sie oben eine CSV-Datei aus.");
        return;
      }
      renderDashboard(data, "/NGA_West2.csv");
    });
