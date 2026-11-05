import type { BestOf, MapMeta, Side } from "../api/types";

interface Props {
  bestOf: BestOf;
  map: string | null;
  pickedBy: Side | null;
  pool: MapMeta[];
  nameA: string;
  nameB: string;
  onBestOf: (b: BestOf) => void;
  onMap: (m: string | null) => void;
  onPickedBy: (s: Side | null) => void;
}

function Segmented<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="field">
      <legend className="field-label">{legend}</legend>
      <div className="segmented">
        {options.map((o) => (
          <label key={String(o.value)} className={value === o.value ? "seg is-on" : "seg"}>
            <input type="radio" name={name} value={String(o.value)} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function MatchSetup({ bestOf, map, pickedBy, pool, nameA, nameB, onBestOf, onMap, onPickedBy }: Props) {
  return (
    <section className="card" aria-labelledby="setup-h">
      <h2 id="setup-h">Match setup</h2>
      <Segmented<BestOf>
        legend="Format"
        name="best-of"
        value={bestOf}
        options={[
          { value: 1, label: "Best of 1" },
          { value: 3, label: "Best of 3" },
          { value: 5, label: "Best of 5" },
        ]}
        onChange={onBestOf}
      />
      <Segmented<"veto" | "map">
        legend="Map"
        name="map-mode"
        value={map ? "map" : "veto"}
        options={[
          { value: "veto", label: "Let the veto decide" },
          { value: "map", label: "Specific map" },
        ]}
        onChange={(v) => {
          if (v === "veto") {
            onMap(null);
            onPickedBy(null);
          } else if (!map && pool[0]) {
            onMap(pool[0].name);
          }
        }}
      />
      {map ? (
        <>
          <div className="map-tiles" role="group" aria-label="Choose a map from the current pool">
            {pool.map((m) => (
              <button key={m.name} type="button" className="map-tile" aria-pressed={map === m.name} onClick={() => onMap(m.name)}>
                {m.minimap ? <img src={m.minimap} alt="" width="96" height="96" loading="lazy" decoding="async" /> : <span className="map-blank" />}
                <span>{m.name}</span>
              </button>
            ))}
          </div>
          <Segmented<"none" | Side>
            legend="Who picked this map"
            name="picked-by"
            value={pickedBy ?? "none"}
            options={[
              { value: "none", label: "Not set" },
              { value: "a", label: `A: ${nameA}` },
              { value: "b", label: `B: ${nameB}` },
            ]}
            onChange={(v) => onPickedBy(v === "none" ? null : v)}
          />
        </>
      ) : (
        <p className="hint">
          {bestOf === 1
            ? "Odds are averaged over the current map pool."
            : "The model simulates the ban and pick phase on the current map pool and averages the result."}
        </p>
      )}
    </section>
  );
}
