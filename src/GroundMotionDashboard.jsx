import d3 from "./d3-global.js";
import { useEffect, useRef } from "react";
import "./ground-motion.css";

export default function GroundMotionDashboard({ preloadedRecords = [] }) {
  const rootRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function boot() {
      await import("../js/config.js");
      await import("../js/utils.js");
      await import("../js/charts/scatterPlot.js");
      await import("../js/charts/histogram.js");
      await import("../js/charts/densityPlot.js");
      await import("../js/charts/dashboard.js");

      if (!active || !window.App) return;

      if (preloadedRecords.length > 0) {
        const rootEl = rootRef.current;
        if (!rootEl) return;

        const renderFilteredSources = () => {
          const checkedFiles = Array.from(
            rootEl.querySelectorAll("input[type=checkbox].data:checked")
          ).map((cb) => cb.id.replace("-checkbox", ".csv").toLowerCase());

          if (checkedFiles.length === 0) {
            d3.select(rootEl).select("#file-status")
              .style("color", "orange")
              .text("Bitte mindestens einen Datensatz auswählen.");
            d3.select(rootEl).select("#my_dataviz").selectAll("*").remove();
            d3.select(rootEl).select("#mag_histogram").selectAll("svg").remove();
            d3.select(rootEl).select("#pga_density").selectAll("svg").remove();
            return;
          }

          const subset = preloadedRecords.filter((r) =>
            checkedFiles.includes(String(r._sourceFile).toLowerCase())
          );

          window.App.Dashboard.render(subset, checkedFiles.join(", "));
        };

        const checkboxes = rootEl.querySelectorAll("input[type=checkbox].data");
        checkboxes.forEach((cb) => {
          cb.addEventListener("change", renderFilteredSources);
        });

        renderFilteredSources();

        return () => {
          checkboxes.forEach((cb) => {
            cb.removeEventListener("change", renderFilteredSources);
          });
        };
      } else {
        await import("../js/main.js");
        window.App.Main?.init();
      }
    }

    boot();
    return () => {
      active = false;
    };
  }, [preloadedRecords]);

  return (
    <div ref={rootRef} className="ground-motion-app">
      <div className="gm-header">
        <h1>Ground Motion Dashboard</h1>
      </div>

      <div className="gm-grid">
        {/* Linke Spalte: Controls */}
        <div className="left-column">
          <div className="file-upload-box">
            <label
              htmlFor="csv-file-input"
              style={{ fontSize: "12px", fontWeight: 600 }}
            >
              CSV-Datei von Festplatte laden:
            </label>
            <input id="csv-file-input" type="file" accept=".csv" />
            <div id="file-status">Bereit</div>
          </div>

          <div className="control-group">
            <div className="control-group-title">Verfügbare Datenquellen</div>
            <label className="control-row">
              <input
                id="nga-west2-checkbox"
                className="data"
                type="checkbox"
                defaultChecked
              />
              <span>NGA-West2</span>
            </label>
            <label className="control-row">
              <input id="esm-checkbox" className="data" type="checkbox" />
              <span>ESM</span>
            </label>
          </div>

          <div className="control-group">
            <label className="slider-label">
              <span>
                Min. Magnitude: <strong id="mag-value">3.0</strong>
              </span>
              <input
                id="mag-slider"
                type="range"
                min="3"
                max="8"
                step="0.1"
                defaultValue="3"
              />
            </label>
          </div>

          <div className="control-group">
            <div className="control-group-title">Achsen & Regression</div>
            <label className="control-row">
              <input id="log-x-checkbox" type="checkbox" defaultChecked />
              <span>Log X-Achse (Distanz)</span>
            </label>
            <label className="control-row">
              <input id="log-y-checkbox" type="checkbox" defaultChecked />
              <span>Log Y-Achse (PGA)</span>
            </label>
            <label className="control-row">
              <input id="trendline-checkbox" type="checkbox" defaultChecked />
              <span>Trendlinie anzeigen</span>
            </label>
          </div>

          <div className="control-group">
            <div className="control-group-title">Distanz-Metrik</div>
            {[
              ["HypD (km)", "HypD (km)"],
              ["EpiD (km)", "EpiD (km)"],
              ["Joyner-Boore Dist. (km)", "Joyner-Boore Dist. (km)"],
              ["R_rup_calc (km)", "R_rup (berechnet, km)"],
              ["R_JB_calc (km)", "R_JB (berechnet, km)"],
              ["R_w (km)", "R_w (Ø 2D-Ecken, km)"],
              ["R_z (km)", "R_z (Ø 3D-Ecken, km)"],
            ].map(([val, label]) => (
              <label key={val} className="control-row">
                <input
                  type="radio"
                  name="distance"
                  value={val}
                  defaultChecked={val === "HypD (km)"}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Mittlere Spalte: Canvas + SVG Scatterplot */}
        <div className="middle-column">
          <div id="my_dataviz" />
        </div>

        {/* Rechte Spalte: Histogramm + PGA Density */}
        <div className="right-column">
          <div className="side-chart">
            <h3>Magnituden-Verteilung</h3>
            <div id="mag_histogram" />
          </div>
          <div className="side-chart">
            <h3>PGA-Dichte (log10)</h3>
            <div id="pga_density" />
          </div>
        </div>
      </div>
    </div>
  );
}
