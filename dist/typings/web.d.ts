import { WebPlugin } from '@capacitor/core';
import { LatLngBounds } from './definitions';
import type { AddMarkerArgs, CameraArgs, AddMarkersArgs, CapacitorGoogleMapsPlugin, CreateMapArgs, DestroyMapArgs, RemoveMarkerArgs, RemoveMarkersArgs, MapBoundsContainsArgs, EnableClusteringArgs, FitBoundsArgs, MapBoundsExtendArgs, AddPolygonsArgs, RemovePolygonsArgs, AddCirclesArgs, RemoveCirclesArgs, AddPolylinesArgs, RemovePolylinesArgs, UpdateMapArgs, AddFeatureArgs, GetFeatureBoundsArgs, RemoveFeatureArgs } from './implementation';
export declare class CapacitorGoogleMapsWeb extends WebPlugin implements CapacitorGoogleMapsPlugin {
    private gMapsRef;
    private AdvancedMarkerElement;
    private PinElement;
    private maps;
    private currMarkerId;
    private currPolygonId;
    private currCircleId;
    private currPolylineId;
    private currMapId;
    private onClusterClickHandler;
    private getIdFromMap;
    private getIdFromMarker;
    private importGoogleLib;
    enableTouch(_args: {
        id: string;
    }): Promise<void>;
    disableTouch(_args: {
        id: string;
    }): Promise<void>;
    setCamera(_args: CameraArgs): Promise<void>;
    dispatchMapEvent(): Promise<void>;
    getMapBounds(_args: {
        id: string;
    }): Promise<LatLngBounds>;
    fitBounds(_args: FitBoundsArgs): Promise<void>;
    addMarkers(_args: AddMarkersArgs): Promise<{
        ids: string[];
    }>;
    addMarker(_args: AddMarkerArgs): Promise<{
        id: string;
    }>;
    removeMarkers(_args: RemoveMarkersArgs): Promise<void>;
    removeMarker(_args: RemoveMarkerArgs): Promise<void>;
    addPolygons(args: AddPolygonsArgs): Promise<{
        ids: string[];
    }>;
    removePolygons(args: RemovePolygonsArgs): Promise<void>;
    addCircles(args: AddCirclesArgs): Promise<{
        ids: string[];
    }>;
    removeCircles(args: RemoveCirclesArgs): Promise<void>;
    addPolylines(args: AddPolylinesArgs): Promise<{
        ids: string[];
    }>;
    removePolylines(args: RemovePolylinesArgs): Promise<void>;
    addFeatures(args: AddFeatureArgs): Promise<{
        ids: string[];
    }>;
    getFeatureBounds(args: GetFeatureBoundsArgs): Promise<{
        bounds: LatLngBounds;
    }>;
    removeFeature(args: RemoveFeatureArgs): Promise<void>;
    enableClustering(_args: EnableClusteringArgs): Promise<void>;
    disableClustering(_args: {
        id: string;
    }): Promise<void>;
    onScroll(): Promise<void>;
    onResize(): Promise<void>;
    onDisplay(): Promise<void>;
    create(_args: CreateMapArgs): Promise<void>;
    update(_args: UpdateMapArgs): Promise<void>;
    private applyConfig;
    private enableMyLocation;
    private setTrafficLayer;
    private setMapTypeId;
    private setPadding;
    destroy(_args: DestroyMapArgs): Promise<void>;
    mapBoundsContains(_args: MapBoundsContainsArgs): Promise<{
        contains: boolean;
    }>;
    mapBoundsExtend(_args: MapBoundsExtendArgs): Promise<{
        bounds: LatLngBounds;
    }>;
    private getLatLngBounds;
    setCircleListeners(mapId: string, circleId: string, circle: google.maps.Circle): Promise<void>;
    setPolygonListeners(mapId: string, polygonId: string, polygon: google.maps.Polygon): Promise<void>;
    setPolylineListeners(mapId: string, polylineId: string, polyline: google.maps.Polyline): Promise<void>;
    setMarkerListeners(mapId: string, markerId: string, marker: google.maps.marker.AdvancedMarkerElement): Promise<void>;
    setMapListeners(mapId: string): Promise<void>;
    private buildMarkerOpts;
}
