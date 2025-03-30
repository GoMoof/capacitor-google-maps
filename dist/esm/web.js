import { WebPlugin } from '@capacitor/core';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { FeatureType, LatLngBounds } from './definitions';
class MapInstance {
    constructor() {
        this.markers = {};
        this.polygons = {};
        this.circles = {};
        this.polylines = {};
    }
}
export class CapacitorGoogleMapsWeb extends WebPlugin {
    constructor() {
        super(...arguments);
        this.gMapsRef = undefined;
        this.AdvancedMarkerElement = undefined;
        this.PinElement = undefined;
        this.maps = {};
        this.currMarkerId = 0;
        this.currPolygonId = 0;
        this.currCircleId = 0;
        this.currPolylineId = 0;
        this.currMapId = 0;
        this.onClusterClickHandler = (_, cluster, map) => {
            var _a;
            const mapId = this.getIdFromMap(map);
            const items = [];
            if (cluster.markers != undefined && this.AdvancedMarkerElement) {
                for (const marker of cluster.markers) {
                    if (marker instanceof this.AdvancedMarkerElement) {
                        const markerId = this.getIdFromMarker(mapId, marker);
                        const position = marker.position;
                        items.push({
                            markerId: markerId,
                            latitude: position.lat,
                            longitude: position.lng,
                            title: (_a = marker.title) !== null && _a !== void 0 ? _a : '',
                            snippet: '',
                        });
                    }
                }
            }
            this.notifyListeners('onClusterClick', {
                mapId: mapId,
                latitude: cluster.position.lat,
                longitude: cluster.position.lng,
                size: cluster.count,
                items: items,
            });
        };
    }
    getIdFromMap(map) {
        for (const id in this.maps) {
            if (this.maps[id].map == map) {
                return id;
            }
        }
        return '';
    }
    getIdFromMarker(mapId, marker) {
        for (const id in this.maps[mapId].markers) {
            if (this.maps[mapId].markers[id] == marker) {
                return id;
            }
        }
        return '';
    }
    async importGoogleLib(apiKey, region, language) {
        if (this.gMapsRef === undefined) {
            const lib = await import('@googlemaps/js-api-loader');
            const loader = new lib.Loader({
                apiKey: apiKey !== null && apiKey !== void 0 ? apiKey : '',
                version: 'weekly',
                language,
                region,
            });
            this.gMapsRef = await loader.importLibrary('maps');
            // Import marker library once
            const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary('marker'));
            this.AdvancedMarkerElement = AdvancedMarkerElement;
            this.PinElement = PinElement;
            console.log('Loaded google maps API');
        }
    }
    async enableTouch(_args) {
        this.maps[_args.id].map.setOptions({ gestureHandling: 'auto' });
    }
    async disableTouch(_args) {
        this.maps[_args.id].map.setOptions({ gestureHandling: 'none' });
    }
    async setCamera(_args) {
        // Animation not supported yet...
        this.maps[_args.id].map.moveCamera({
            center: _args.config.coordinate,
            heading: _args.config.bearing,
            tilt: _args.config.angle,
            zoom: _args.config.zoom,
        });
    }
    dispatchMapEvent() {
        throw new Error('Method not supported on web.');
    }
    async getMapBounds(_args) {
        const bounds = this.maps[_args.id].map.getBounds();
        if (!bounds) {
            throw new Error('Google Map Bounds could not be found.');
        }
        return new LatLngBounds({
            southwest: {
                lat: bounds.getSouthWest().lat(),
                lng: bounds.getSouthWest().lng(),
            },
            center: {
                lat: bounds.getCenter().lat(),
                lng: bounds.getCenter().lng(),
            },
            northeast: {
                lat: bounds.getNorthEast().lat(),
                lng: bounds.getNorthEast().lng(),
            },
        });
    }
    async fitBounds(_args) {
        const map = this.maps[_args.id].map;
        const bounds = this.getLatLngBounds(_args.bounds);
        map.fitBounds(bounds, _args.padding);
    }
    async addMarkers(_args) {
        const markerIds = [];
        const map = this.maps[_args.id];
        for (const markerArgs of _args.markers) {
            const advancedMarker = this.buildMarkerOpts(markerArgs, map.map);
            const id = '' + this.currMarkerId;
            map.markers[id] = advancedMarker;
            await this.setMarkerListeners(_args.id, id, advancedMarker);
            markerIds.push(id);
            this.currMarkerId++;
        }
        return { ids: markerIds };
    }
    async addMarker(_args) {
        const advancedMarker = this.buildMarkerOpts(_args.marker, this.maps[_args.id].map);
        const id = '' + this.currMarkerId;
        this.maps[_args.id].markers[id] = advancedMarker;
        await this.setMarkerListeners(_args.id, id, advancedMarker);
        this.currMarkerId++;
        return { id: id };
    }
    async removeMarkers(_args) {
        const map = this.maps[_args.id];
        for (const id of _args.markerIds) {
            if (map.markers[id]) {
                map.markers[id].map = null;
                delete map.markers[id];
            }
        }
    }
    async removeMarker(_args) {
        if (this.maps[_args.id].markers[_args.markerId]) {
            this.maps[_args.id].markers[_args.markerId].map = null;
            delete this.maps[_args.id].markers[_args.markerId];
        }
    }
    async addPolygons(args) {
        const polygonIds = [];
        const map = this.maps[args.id];
        for (const polygonArgs of args.polygons) {
            const polygon = new google.maps.Polygon(polygonArgs);
            polygon.setMap(map.map);
            const id = '' + this.currPolygonId;
            this.maps[args.id].polygons[id] = polygon;
            this.setPolygonListeners(args.id, id, polygon);
            polygonIds.push(id);
            this.currPolygonId++;
        }
        return { ids: polygonIds };
    }
    async removePolygons(args) {
        const map = this.maps[args.id];
        for (const id of args.polygonIds) {
            map.polygons[id].setMap(null);
            delete map.polygons[id];
        }
    }
    async addCircles(args) {
        const circleIds = [];
        const map = this.maps[args.id];
        for (const circleArgs of args.circles) {
            const circle = new google.maps.Circle(circleArgs);
            circle.setMap(map.map);
            const id = '' + this.currCircleId;
            this.maps[args.id].circles[id] = circle;
            this.setCircleListeners(args.id, id, circle);
            circleIds.push(id);
            this.currCircleId++;
        }
        return { ids: circleIds };
    }
    async removeCircles(args) {
        const map = this.maps[args.id];
        for (const id of args.circleIds) {
            map.circles[id].setMap(null);
            delete map.circles[id];
        }
    }
    async addPolylines(args) {
        const lineIds = [];
        const map = this.maps[args.id];
        for (const polylineArgs of args.polylines) {
            const polyline = new google.maps.Polyline(polylineArgs);
            polyline.set('tag', polylineArgs.tag);
            polyline.setMap(map.map);
            const id = '' + this.currPolylineId;
            this.maps[args.id].polylines[id] = polyline;
            this.setPolylineListeners(args.id, id, polyline);
            lineIds.push(id);
            this.currPolylineId++;
        }
        return {
            ids: lineIds,
        };
    }
    async removePolylines(args) {
        const map = this.maps[args.id];
        for (const id of args.polylineIds) {
            map.polylines[id].setMap(null);
            delete map.polylines[id];
        }
    }
    async addFeatures(args) {
        const featureIds = [];
        const map = this.maps[args.id];
        if (args.type === FeatureType.GeoJSON) {
            featureIds.push(...map.map.data
                .addGeoJson(args.data, args.idPropertyName ? { idPropertyName: args.idPropertyName } : null)
                .map((f) => f.getId())
                .filter((f) => f !== undefined)
                .map((f) => f === null || f === void 0 ? void 0 : f.toString()));
        }
        else {
            const featureId = map.map.data.add(args.data).getId();
            if (featureId) {
                featureIds.push(featureId.toString());
            }
        }
        if (args.styles) {
            map.map.data.setStyle((feature) => {
                var _a;
                const featureId = feature.getId();
                return featureId ? (_a = args.styles) === null || _a === void 0 ? void 0 : _a[featureId] : null;
            });
        }
        return {
            ids: featureIds,
        };
    }
    async getFeatureBounds(args) {
        var _a;
        if (!args.featureId) {
            throw new Error('Feature id not set.');
        }
        const map = this.maps[args.id];
        const feature = map.map.data.getFeatureById(args.featureId);
        if (!feature) {
            throw new Error(`Feature '${args.featureId}' could not be found.`);
        }
        const bounds = new google.maps.LatLngBounds();
        (_a = feature === null || feature === void 0 ? void 0 : feature.getGeometry()) === null || _a === void 0 ? void 0 : _a.forEachLatLng((latLng) => {
            bounds.extend(latLng);
        });
        return {
            bounds: new LatLngBounds({
                southwest: bounds.getSouthWest().toJSON(),
                center: bounds.getCenter().toJSON(),
                northeast: bounds.getNorthEast().toJSON(),
            }),
        };
    }
    async removeFeature(args) {
        if (!args.featureId) {
            throw new Error('Feature id not set.');
        }
        const map = this.maps[args.id];
        const feature = map.map.data.getFeatureById(args.featureId);
        if (!feature) {
            throw new Error(`Feature '${args.featureId}' could not be found.`);
        }
        map.map.data.remove(feature);
    }
    async enableClustering(_args) {
        var _a;
        const markers = [];
        for (const id in this.maps[_args.id].markers) {
            markers.push(this.maps[_args.id].markers[id]);
        }
        this.maps[_args.id].markerClusterer = new MarkerClusterer({
            map: this.maps[_args.id].map,
            markers: markers,
            algorithm: new SuperClusterAlgorithm({
                minPoints: (_a = _args.minClusterSize) !== null && _a !== void 0 ? _a : 4,
            }),
            onClusterClick: this.onClusterClickHandler,
        });
    }
    async disableClustering(_args) {
        const mapInstance = this.maps[_args.id];
        if (mapInstance.markerClusterer) {
            const markers = Object.values(mapInstance.markers);
            mapInstance.markerClusterer.setMap(null);
            mapInstance.markerClusterer = undefined;
            for (const marker of markers) {
                marker.map = mapInstance.map;
            }
        }
    }
    async onScroll() {
        throw new Error('Method not supported on web.');
    }
    async onResize() {
        throw new Error('Method not supported on web.');
    }
    async onDisplay() {
        throw new Error('Method not supported on web.');
    }
    async create(_args) {
        console.log(`Create map: ${_args.id}`);
        await this.importGoogleLib(_args.apiKey, _args.region, _args.language);
        // Ensure we have a Map ID for Advanced Markers
        const config = Object.assign({}, _args.config);
        if (!config.mapId) {
            config.mapId = `capacitor_map_${this.currMapId++}`;
        }
        const mapInstance = {
            map: new window.google.maps.Map(_args.element, config),
            element: _args.element,
            markers: {},
            polygons: {},
            circles: {},
            polylines: {},
        };
        this.applyConfig(mapInstance, config);
        this.maps[_args.id] = mapInstance;
        this.setMapListeners(_args.id);
    }
    async update(_args) {
        const mapInstance = this.maps[_args.id];
        mapInstance.map.setOptions(_args.config);
        this.applyConfig(mapInstance, _args.config);
    }
    applyConfig(mapInstance, config) {
        if (config.isMyLocationEnabled) {
            this.enableMyLocation(mapInstance);
        }
        if (config.isTrafficLayerEnabled !== undefined) {
            this.setTrafficLayer(mapInstance, config.isTrafficLayerEnabled);
        }
        if (config.mapTypeId !== undefined) {
            this.setMapTypeId(mapInstance, config.mapTypeId);
        }
        if (config.padding !== undefined) {
            this.setPadding(mapInstance, config.padding);
        }
    }
    enableMyLocation(mapInstance) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                mapInstance.map.setCenter(pos);
                this.notifyListeners('onMyLocationButtonClick', {});
                this.notifyListeners('onMyLocationClick', {});
            }, () => {
                throw new Error('Geolocation not supported on web browser.');
            });
        }
        else {
            throw new Error('Geolocation not supported on web browser.');
        }
    }
    setTrafficLayer(mapInstance, enabled) {
        var _a;
        const trafficLayer = (_a = mapInstance.trafficLayer) !== null && _a !== void 0 ? _a : new google.maps.TrafficLayer();
        if (enabled) {
            trafficLayer.setMap(mapInstance.map);
            mapInstance.trafficLayer = trafficLayer;
        }
        else if (mapInstance.trafficLayer) {
            trafficLayer.setMap(null);
            mapInstance.trafficLayer = undefined;
        }
    }
    setMapTypeId(mapInstance, typeId) {
        mapInstance.map.setMapTypeId(typeId);
    }
    setPadding(mapInstance, padding) {
        const bounds = mapInstance.map.getBounds();
        if (bounds !== undefined) {
            mapInstance.map.fitBounds(bounds, padding);
        }
    }
    async destroy(_args) {
        console.log(`Destroy map: ${_args.id}`);
        const mapItem = this.maps[_args.id];
        mapItem.element.innerHTML = '';
        mapItem.map.unbindAll();
        delete this.maps[_args.id];
    }
    async mapBoundsContains(_args) {
        const bounds = this.getLatLngBounds(_args.bounds);
        const point = new google.maps.LatLng(_args.point.lat, _args.point.lng);
        return { contains: bounds.contains(point) };
    }
    async mapBoundsExtend(_args) {
        const bounds = this.getLatLngBounds(_args.bounds);
        const point = new google.maps.LatLng(_args.point.lat, _args.point.lng);
        bounds.extend(point);
        const result = new LatLngBounds({
            southwest: {
                lat: bounds.getSouthWest().lat(),
                lng: bounds.getSouthWest().lng(),
            },
            center: {
                lat: bounds.getCenter().lat(),
                lng: bounds.getCenter().lng(),
            },
            northeast: {
                lat: bounds.getNorthEast().lat(),
                lng: bounds.getNorthEast().lng(),
            },
        });
        return { bounds: result };
    }
    getLatLngBounds(_args) {
        return new google.maps.LatLngBounds(new google.maps.LatLng(_args.southwest.lat, _args.southwest.lng), new google.maps.LatLng(_args.northeast.lat, _args.northeast.lng));
    }
    async setCircleListeners(mapId, circleId, circle) {
        circle.addListener('click', () => {
            this.notifyListeners('onCircleClick', {
                mapId: mapId,
                circleId: circleId,
                tag: circle.get('tag'),
            });
        });
    }
    async setPolygonListeners(mapId, polygonId, polygon) {
        polygon.addListener('click', () => {
            this.notifyListeners('onPolygonClick', {
                mapId: mapId,
                polygonId: polygonId,
                tag: polygon.get('tag'),
            });
        });
    }
    async setPolylineListeners(mapId, polylineId, polyline) {
        polyline.addListener('click', () => {
            this.notifyListeners('onPolylineClick', {
                mapId: mapId,
                polylineId: polylineId,
                tag: polyline.get('tag'),
            });
        });
    }
    async setMarkerListeners(mapId, markerId, marker) {
        marker.addListener('click', () => {
            var _a;
            const position = marker.position;
            this.notifyListeners('onMarkerClick', {
                mapId: mapId,
                markerId: markerId,
                latitude: position.lat,
                longitude: position.lng,
                title: (_a = marker.title) !== null && _a !== void 0 ? _a : '',
                snippet: '',
            });
        });
        if (marker.gmpDraggable) {
            marker.addListener('dragstart', () => {
                var _a;
                const position = marker.position;
                this.notifyListeners('onMarkerDragStart', {
                    mapId: mapId,
                    markerId: markerId,
                    latitude: position.lat,
                    longitude: position.lng,
                    title: (_a = marker.title) !== null && _a !== void 0 ? _a : '',
                    snippet: '',
                });
            });
            marker.addListener('drag', () => {
                var _a;
                const position = marker.position;
                this.notifyListeners('onMarkerDrag', {
                    mapId: mapId,
                    markerId: markerId,
                    latitude: position.lat,
                    longitude: position.lng,
                    title: (_a = marker.title) !== null && _a !== void 0 ? _a : '',
                    snippet: '',
                });
            });
            marker.addListener('dragend', () => {
                var _a;
                const position = marker.position;
                this.notifyListeners('onMarkerDragEnd', {
                    mapId: mapId,
                    markerId: markerId,
                    latitude: position.lat,
                    longitude: position.lng,
                    title: (_a = marker.title) !== null && _a !== void 0 ? _a : '',
                    snippet: '',
                });
            });
        }
    }
    async setMapListeners(mapId) {
        const map = this.maps[mapId].map;
        map.addListener('idle', async () => {
            var _a, _b;
            const bounds = await this.getMapBounds({ id: mapId });
            this.notifyListeners('onCameraIdle', {
                mapId: mapId,
                bearing: map.getHeading(),
                bounds: bounds,
                latitude: (_a = map.getCenter()) === null || _a === void 0 ? void 0 : _a.lat(),
                longitude: (_b = map.getCenter()) === null || _b === void 0 ? void 0 : _b.lng(),
                tilt: map.getTilt(),
                zoom: map.getZoom(),
            });
        });
        map.addListener('center_changed', () => {
            this.notifyListeners('onCameraMoveStarted', {
                mapId: mapId,
                isGesture: true,
            });
        });
        map.addListener('bounds_changed', async () => {
            var _a, _b;
            const bounds = await this.getMapBounds({ id: mapId });
            this.notifyListeners('onBoundsChanged', {
                mapId: mapId,
                bearing: map.getHeading(),
                bounds: bounds,
                latitude: (_a = map.getCenter()) === null || _a === void 0 ? void 0 : _a.lat(),
                longitude: (_b = map.getCenter()) === null || _b === void 0 ? void 0 : _b.lng(),
                tilt: map.getTilt(),
                zoom: map.getZoom(),
            });
        });
        map.addListener('click', (e) => {
            var _a, _b;
            this.notifyListeners('onMapClick', {
                mapId: mapId,
                latitude: (_a = e.latLng) === null || _a === void 0 ? void 0 : _a.lat(),
                longitude: (_b = e.latLng) === null || _b === void 0 ? void 0 : _b.lng(),
            });
        });
        this.notifyListeners('onMapReady', {
            mapId: mapId,
        });
    }
    buildMarkerOpts(marker, map) {
        var _a;
        if (!this.AdvancedMarkerElement || !this.PinElement) {
            throw new Error('Marker library not loaded');
        }
        let content = undefined;
        if (marker.iconUrl) {
            const img = document.createElement('img');
            img.src = marker.iconUrl;
            if (marker.iconSize) {
                img.style.width = `${marker.iconSize.width}px`;
                img.style.height = `${marker.iconSize.height}px`;
            }
            content = img;
        }
        else {
            const pinOptions = {
                scale: (_a = marker.opacity) !== null && _a !== void 0 ? _a : 1,
                glyph: marker.title,
                background: marker.tintColor
                    ? `rgb(${marker.tintColor.r}, ${marker.tintColor.g}, ${marker.tintColor.b})`
                    : undefined,
            };
            const pin = new this.PinElement(pinOptions);
            content = pin.element;
        }
        const advancedMarker = new this.AdvancedMarkerElement({
            position: marker.coordinate,
            map: map,
            content: content,
            title: marker.title,
            gmpDraggable: marker.draggable,
        });
        return advancedMarker;
    }
}
//# sourceMappingURL=web.js.map