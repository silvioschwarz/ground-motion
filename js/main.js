window.App = window.App || {}; 
const App = window.App; 
const d3 = window.d3;

window.App.Main = {
  init: function() {
    var self = this;

    d3.selectAll("input[type=checkbox].data").on("change", function() {
      self.loadSelectedFiles();
    });

    this.loadSelectedFiles();
  },

  loadSelectedFiles: function() {
    var self = this;
    var checkedNodes = d3.selectAll("input[type=checkbox]:checked.data").nodes();

    if (checkedNodes.length === 0) {
      d3.select("#file-status")
        .style("color", "orange")
        .text("Bitte mindestens einen Datensatz auswählen.");
      d3.select("#my_dataviz").selectAll("*").remove();
      d3.select("#mag_histogram").selectAll("svg").remove();
      d3.select("#pga_density").selectAll("svg").remove();
      return;
    }

    var fileNames = checkedNodes.map(function(node) {
      return node.id.slice(0, -9) + ".csv"; // Entfernt "-checkbox"
    });

    d3.select("#file-status")
      .style("color", "#555")
      .text("Lade " + fileNames.length + " Datei(en)...");

    Promise.all(
      fileNames.map(function(fileName) {
        return d3.csv("data/" + fileName).then(function(dataset) {
          return dataset.map(function(row) {
            return self.normalizeRow(row, fileName);
          });
        });
      })
    )
      .then(function(results) {
        var combinedData = results.flat();
        App.Dashboard.render(combinedData, fileNames.join(", "));
      })
      .catch(function(error) {
        d3.select("#file-status")
          .style("color", "red")
          .text("Fehler beim Laden der CSV-Dateien.");
        console.error("CSV Ladefehler:", error);
      });
  },


  normalizeRow: function(row, fileName) {
    row._sourceFile = fileName;

    
// 1. PGA (g): ESM liefert cm/s^2 -> durch 980.665 teilen, um g zu erhalten
if (row["PGA (g)"] === undefined) {
  var rawPga = row["rotD50_pga"] || row["U_pga"] || row["V_pga"] || row["W_pga"];
  if (rawPga !== undefined && rawPga !== "") {
    var pgaCmS2 = App.Utils.parseNum(rawPga);
    if (!isNaN(pgaCmS2)) {
      row["PGA (g)"] = pgaCmS2 / 980.665;
    }
  }
}

    // 2. Magnitude: Bevorzugt Mw, sonst ML oder Ms
    if (row["Earthquake Magnitude"] === undefined) {
      row["Earthquake Magnitude"] = row["Mw"] || row["ML"] || row["Ms"];
    }

    // 3. HypD (km): Aus epi_dist und ev_depth_km berechnen (Pythagoras)
    if (row["HypD (km)"] === undefined) {
      var epi = App.Utils.parseNum(row["epi_dist"]);
      var depth = App.Utils.parseNum(row["ev_depth_km"]);
      if (!isNaN(epi) && !isNaN(depth)) {
        row["HypD (km)"] = Math.sqrt(epi * epi + depth * depth);
      } else if (!isNaN(epi)) {
        row["HypD (km)"] = epi;
      }
    }

    // 4. Weitere Distanz-Metriken für deine Radio-Buttons mappen
    if (row["EpiD (km)"] === undefined && row["epi_dist"] !== undefined) {
      row["EpiD (km)"] = row["epi_dist"];
    }
    if (row["JB (km)"] === undefined && row["JB_dist"] !== undefined) {
      row["JB (km)"] = row["JB_dist"];
    }
    if (row["RupD (km)"] === undefined && row["rup_dist"] !== undefined) {
      row["RupD (km)"] = row["rup_dist"];
    }

    // 5. Earthquake ID (Hinweis: In deiner Kopfzeile stand "vent_id" statt "event_id" – beides wird abgedeckt)
    if (row["Earthquake ID"] === undefined) {
      row["Earthquake ID"] = row["event_id"] || row["vent_id"] || row["USGS_ev_id"] || row["INGV_ev_id"];
    }

    return row;
  }
};

App.Main.init();
