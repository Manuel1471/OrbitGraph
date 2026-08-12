import * as maplibregl from "maplibre-gl";
import type { GraphData } from "@orbitgraph/core";
/** Adds graph nodes with longitude/latitude metadata to a MapLibre map. */
export class MapLibreGraphLayer {
    constructor(private readonly map: maplibregl.Map, private readonly sourceId = "orbitgraph-nodes") {}
    setData(data: GraphData, longitudeField = "longitude", latitudeField = "latitude"): void {
        const geojson = { type: "FeatureCollection" as const, features: data.nodes.flatMap((node) => { const longitude = Number(node.data?.[longitudeField]); const latitude = Number(node.data?.[latitudeField]); return Number.isFinite(longitude) && Number.isFinite(latitude) ? [{ type: "Feature" as const, properties: { id: node.id, label: node.label ?? node.id, color: node.color ?? "#22d3ee" }, geometry: { type: "Point" as const, coordinates: [longitude, latitude] } }] : []; }) };
        const source = this.map.getSource(this.sourceId) as maplibregl.GeoJSONSource | undefined; if (source) source.setData(geojson); else { this.map.addSource(this.sourceId, { type: "geojson", data: geojson }); this.map.addLayer({ id: `${this.sourceId}-circles`, type: "circle", source: this.sourceId, paint: { "circle-radius": 6, "circle-color": ["get", "color"] } }); }
    }
}
