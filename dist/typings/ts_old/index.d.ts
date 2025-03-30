import { LatLngBounds, MapType, Marker, Polygon, Circle, Polyline, StyleSpan, FeatureType, FeatureStyles } from './definitions';
import { GoogleMap } from './map';
export { GoogleMap, LatLngBounds, MapType, Marker, Polygon, Circle, Polyline, StyleSpan, FeatureType, FeatureStyles };
declare global {
    export namespace JSX {
        interface IntrinsicElements {
            'capacitor-google-map': any;
        }
    }
}
