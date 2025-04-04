var capacitorCapacitorGoogleMaps = (function (exports, core, markerclusterer) {
    'use strict';

    const CapacitorGoogleMaps = core.registerPlugin('CapacitorGoogleMaps', {
        web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.CapacitorGoogleMapsWeb()),
    });
    CapacitorGoogleMaps.addListener('isMapInFocus', (data) => {
        var _a;
        const x = data.x;
        const y = data.y;
        const elem = document.elementFromPoint(x, y);
        const internalId = (_a = elem === null || elem === void 0 ? void 0 : elem.dataset) === null || _a === void 0 ? void 0 : _a.internalId;
        const mapInFocus = internalId === data.mapId;
        CapacitorGoogleMaps.dispatchMapEvent({ id: data.mapId, focus: mapInFocus });
    });

    class LatLngBounds {
        constructor(bounds) {
            this.southwest = bounds.southwest;
            this.center = bounds.center;
            this.northeast = bounds.northeast;
        }
        async contains(point) {
            const result = await CapacitorGoogleMaps.mapBoundsContains({
                bounds: this,
                point,
            });
            return result['contains'];
        }
        async extend(point) {
            const result = await CapacitorGoogleMaps.mapBoundsExtend({
                bounds: this,
                point,
            });
            this.southwest = result['bounds']['southwest'];
            this.center = result['bounds']['center'];
            this.northeast = result['bounds']['northeast'];
            return this;
        }
    }
    /**
     * Feature types
     */
    exports.FeatureType = void 0;
    (function (FeatureType) {
        /**
         * Default
         */
        FeatureType["Default"] = "Default";
        /**
         * GeoJSON
         */
        FeatureType["GeoJSON"] = "GeoJSON";
    })(exports.FeatureType || (exports.FeatureType = {}));
    exports.MapType = void 0;
    (function (MapType) {
        /**
         * Basic map.
         */
        MapType["Normal"] = "Normal";
        /**
         * Satellite imagery with roads and labels.
         */
        MapType["Hybrid"] = "Hybrid";
        /**
         * Satellite imagery with no labels.
         */
        MapType["Satellite"] = "Satellite";
        /**
         * Topographic data.
         */
        MapType["Terrain"] = "Terrain";
        /**
         * No base map tiles.
         */
        MapType["None"] = "None";
    })(exports.MapType || (exports.MapType = {}));

    class MapCustomElement extends HTMLElement {
        constructor() {
            super();
        }
        connectedCallback() {
            this.innerHTML = '';
            if (core.Capacitor.getPlatform() == 'ios') {
                this.style.overflow = 'scroll';
                this.style['-webkit-overflow-scrolling'] = 'touch';
                const overflowDiv = document.createElement('div');
                overflowDiv.style.height = '200%';
                this.appendChild(overflowDiv);
            }
        }
    }
    customElements.define('capacitor-google-map', MapCustomElement);
    class GoogleMap {
        constructor(id) {
            this.element = null;
            this.resizeObserver = null;
            this.config = null;
            this.handleScrollEvent = () => this.updateMapBounds();
            this.id = id;
        }
        /**
         * Creates a new instance of a Google Map
         * @param options
         * @param callback
         * @returns GoogleMap
         */
        static async create(options, callback) {
            const newMap = new GoogleMap(options.id);
            newMap.config = options.config;
            if (!options.element) {
                throw new Error('container element is required');
            }
            if (options.config.androidLiteMode === undefined) {
                options.config.androidLiteMode = false;
            }
            newMap.element = options.element;
            newMap.element.dataset.internalId = options.id;
            const elementBounds = await GoogleMap.getElementBounds(options.element);
            options.config.width = elementBounds.width;
            options.config.height = elementBounds.height;
            options.config.x = elementBounds.x;
            options.config.y = elementBounds.y;
            options.config.devicePixelRatio = window.devicePixelRatio;
            if (core.Capacitor.getPlatform() == 'android') {
                newMap.initScrolling();
            }
            if (core.Capacitor.isNativePlatform()) {
                options.element = {};
                const getMapBounds = () => {
                    var _a, _b;
                    const mapRect = (_b = (_a = newMap.element) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect()) !== null && _b !== void 0 ? _b : {};
                    return {
                        x: mapRect.x,
                        y: mapRect.y,
                        width: mapRect.width,
                        height: mapRect.height,
                    };
                };
                const onDisplay = () => {
                    CapacitorGoogleMaps.onDisplay({
                        id: newMap.id,
                        mapBounds: getMapBounds(),
                    });
                };
                const onResize = () => {
                    CapacitorGoogleMaps.onResize({
                        id: newMap.id,
                        mapBounds: getMapBounds(),
                    });
                };
                const ionicPage = newMap.element.closest('.ion-page');
                if (core.Capacitor.getPlatform() === 'ios' && ionicPage) {
                    ionicPage.addEventListener('ionViewWillEnter', () => {
                        setTimeout(() => {
                            onDisplay();
                        }, 15);
                        setTimeout(() => {
                            onDisplay();
                        }, 30);
                        setTimeout(() => {
                            onDisplay();
                        }, 100);
                    });
                    ionicPage.addEventListener('ionViewDidEnter', () => {
                        setTimeout(() => {
                            onDisplay();
                        }, 15);
                        setTimeout(() => {
                            onDisplay();
                        }, 30);
                        setTimeout(() => {
                            onDisplay();
                        }, 100);
                    });
                }
                const lastState = {
                    width: elementBounds.width,
                    height: elementBounds.height,
                    isHidden: false,
                };
                newMap.resizeObserver = new ResizeObserver(() => {
                    if (newMap.element != null) {
                        const mapRect = newMap.element.getBoundingClientRect();
                        const isHidden = mapRect.width === 0 && mapRect.height === 0;
                        if (!isHidden) {
                            if (lastState.isHidden) {
                                if (core.Capacitor.getPlatform() === 'ios' && !ionicPage) {
                                    onDisplay();
                                }
                            }
                            else if (lastState.width !== mapRect.width || lastState.height !== mapRect.height) {
                                onResize();
                            }
                        }
                        lastState.width = mapRect.width;
                        lastState.height = mapRect.height;
                        lastState.isHidden = isHidden;
                    }
                });
                newMap.resizeObserver.observe(newMap.element);
            }
            // small delay to allow for iOS WKWebView to setup corresponding element sub-scroll views ???
            await new Promise((resolve, reject) => {
                setTimeout(async () => {
                    try {
                        await CapacitorGoogleMaps.create(options);
                        resolve(undefined);
                    }
                    catch (err) {
                        reject(err);
                    }
                }, 200);
            });
            if (callback) {
                const onMapReadyListener = await CapacitorGoogleMaps.addListener('onMapReady', (data) => {
                    if (data.mapId == newMap.id) {
                        callback(data);
                        onMapReadyListener.remove();
                    }
                });
            }
            return newMap;
        }
        static async getElementBounds(element) {
            return new Promise((resolve) => {
                let elementBounds = element.getBoundingClientRect();
                if (elementBounds.width == 0) {
                    let retries = 0;
                    const boundsInterval = setInterval(function () {
                        if (elementBounds.width == 0 && retries < 30) {
                            elementBounds = element.getBoundingClientRect();
                            retries++;
                        }
                        else {
                            if (retries == 30) {
                                console.warn('Map size could not be determined');
                            }
                            clearInterval(boundsInterval);
                            resolve(elementBounds);
                        }
                    }, 100);
                }
                else {
                    resolve(elementBounds);
                }
            });
        }
        /**
         * Update map options
         *
         * @returns void
         */
        async update(config) {
            var _a, _b;
            Object.assign(this.config, config);
            // Convert restriction latLngBounds to LatLngBoundsLiteral if its in LatLngBounds format
            if (((_a = config.restriction) === null || _a === void 0 ? void 0 : _a.latLngBounds) && ((_b = config.restriction.latLngBounds) === null || _b === void 0 ? void 0 : _b.toJSON)) {
                config.restriction.latLngBounds = config.restriction.latLngBounds.toJSON();
            }
            return CapacitorGoogleMaps.update({
                id: this.id,
                config,
            });
        }
        /**
         * Get map options
         *
         * @returns void
         */
        getOptions() {
            return this.config;
        }
        /**
         * Enable touch events on native map
         *
         * @returns void
         */
        async enableTouch() {
            return CapacitorGoogleMaps.enableTouch({
                id: this.id,
            });
        }
        /**
         * Disable touch events on native map
         *
         * @returns void
         */
        async disableTouch() {
            return CapacitorGoogleMaps.disableTouch({
                id: this.id,
            });
        }
        /**
         * Enable marker clustering
         *
         * @param minClusterSize - The minimum number of markers that can be clustered together.
         * @defaultValue 4
         *
         * @returns void
         */
        async enableClustering(minClusterSize) {
            return CapacitorGoogleMaps.enableClustering({
                id: this.id,
                minClusterSize,
            });
        }
        /**
         * Disable marker clustering
         *
         * @returns void
         */
        async disableClustering() {
            return CapacitorGoogleMaps.disableClustering({
                id: this.id,
            });
        }
        /**
         * Adds a marker to the map
         *
         * @param marker
         * @returns created marker id
         */
        async addMarker(marker) {
            const res = await CapacitorGoogleMaps.addMarker({
                id: this.id,
                marker,
            });
            return res.id;
        }
        /**
         * Adds multiple markers to the map
         *
         * @param markers
         * @returns array of created marker IDs
         */
        async addMarkers(markers) {
            const res = await CapacitorGoogleMaps.addMarkers({
                id: this.id,
                markers,
            });
            return res.ids;
        }
        /**
         * Remove marker from the map
         *
         * @param id id of the marker to remove from the map
         * @returns
         */
        async removeMarker(id) {
            return CapacitorGoogleMaps.removeMarker({
                id: this.id,
                markerId: id,
            });
        }
        /**
         * Remove markers from the map
         *
         * @param ids array of ids to remove from the map
         * @returns
         */
        async removeMarkers(ids) {
            return CapacitorGoogleMaps.removeMarkers({
                id: this.id,
                markerIds: ids,
            });
        }
        async addPolygons(polygons) {
            const res = await CapacitorGoogleMaps.addPolygons({
                id: this.id,
                polygons,
            });
            return res.ids;
        }
        async addPolylines(polylines) {
            const res = await CapacitorGoogleMaps.addPolylines({
                id: this.id,
                polylines,
            });
            return res.ids;
        }
        async removePolygons(ids) {
            return CapacitorGoogleMaps.removePolygons({
                id: this.id,
                polygonIds: ids,
            });
        }
        async addCircles(circles) {
            const res = await CapacitorGoogleMaps.addCircles({
                id: this.id,
                circles,
            });
            return res.ids;
        }
        async removeCircles(ids) {
            return CapacitorGoogleMaps.removeCircles({
                id: this.id,
                circleIds: ids,
            });
        }
        async removePolylines(ids) {
            return CapacitorGoogleMaps.removePolylines({
                id: this.id,
                polylineIds: ids,
            });
        }
        async addFeatures(type, data, idPropertyName, styles) {
            const res = await CapacitorGoogleMaps.addFeatures({
                id: this.id,
                type,
                data,
                idPropertyName,
                styles,
            });
            return res.ids;
        }
        async getFeatureBounds(id) {
            const res = await CapacitorGoogleMaps.getFeatureBounds({
                id: this.id,
                featureId: id,
            });
            return new LatLngBounds(res.bounds);
        }
        async removeFeature(id) {
            return CapacitorGoogleMaps.removeFeature({
                id: this.id,
                featureId: id,
            });
        }
        /**
         * Destroy the current instance of the map
         */
        async destroy() {
            var _a;
            if (core.Capacitor.getPlatform() == 'android') {
                this.disableScrolling();
            }
            if (core.Capacitor.isNativePlatform()) {
                (_a = this.resizeObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
            }
            this.removeAllMapListeners();
            return CapacitorGoogleMaps.destroy({
                id: this.id,
            });
        }
        /**
         * Update the map camera configuration
         *
         * @param config
         * @returns
         */
        async setCamera(config) {
            return CapacitorGoogleMaps.setCamera({
                id: this.id,
                config,
            });
        }
        /**
         * @deprecated This method will be removed in v7. Use {@link #update()} instead.
         */
        async getMapType() {
            var _a;
            return Promise.resolve(exports.MapType[(_a = this.getOptions()) === null || _a === void 0 ? void 0 : _a.mapTypeId]);
        }
        /**
         * Sets the type of map tiles that should be displayed.
         * @deprecated This method will be removed in v7. Use {@link #update()} instead.
         *
         * @param mapType
         * @returns
         */
        async setMapType(mapType) {
            return CapacitorGoogleMaps.update({
                id: this.id,
                config: {
                    mapTypeId: mapType,
                },
            });
        }
        /**
         * Sets whether indoor maps are shown, where available.
         * @deprecated This method will be removed in v7. Use {@link #update()} instead.
         *
         * @param enabled
         * @returns
         */
        async enableIndoorMaps(enabled) {
            return CapacitorGoogleMaps.update({
                id: this.id,
                config: {
                    isIndoorMapsEnabled: enabled,
                },
            });
        }
        /**
         * Controls whether the map is drawing traffic data, if available.
         * @deprecated This method will be removed in v7. Use {@link #update()} instead.
         *
         * @param enabled
         * @returns
         */
        async enableTrafficLayer(enabled) {
            return CapacitorGoogleMaps.update({
                id: this.id,
                config: {
                    isTrafficLayerEnabled: enabled,
                },
            });
        }
        /**
         * Show accessibility elements for overlay objects, such as Marker and Polyline.
         * @deprecated This method will be removed in v7. Use {@link #update()} instead.
         *
         * Only available on iOS.
         *
         * @param enabled
         * @returns
         */
        async enableAccessibilityElements(enabled) {
            return CapacitorGoogleMaps.update({
                id: this.id,
                config: {
                    isAccessibilityElementsEnabled: enabled,
                },
            });
        }
        /**
         * Set whether the My Location dot and accuracy circle is enabled.
         * @deprecated This method will be removed in v7. Use {@link #update()} instead.
         *
         * @param enabled
         * @returns
         */
        async enableCurrentLocation(enabled) {
            return CapacitorGoogleMaps.update({
                id: this.id,
                config: {
                    isMyLocationEnabled: enabled,
                },
            });
        }
        /**
         * Set padding on the 'visible' region of the view.
         * @deprecated This method will be removed in v7. Use {@link #update()} instead.
         *
         * @param padding
         * @returns
         */
        async setPadding(padding) {
            return CapacitorGoogleMaps.update({
                id: this.id,
                config: {
                    padding,
                },
            });
        }
        /**
         * Get the map's current viewport latitude and longitude bounds.
         *
         * @returns {LatLngBounds}
         */
        async getMapBounds() {
            return new LatLngBounds(await CapacitorGoogleMaps.getMapBounds({
                id: this.id,
            }));
        }
        async fitBounds(bounds, padding) {
            return CapacitorGoogleMaps.fitBounds({
                id: this.id,
                bounds,
                padding,
            });
        }
        initScrolling() {
            const ionContents = document.getElementsByTagName('ion-content');
            // eslint-disable-next-line @typescript-eslint/prefer-for-of
            for (let i = 0; i < ionContents.length; i++) {
                ionContents[i].scrollEvents = true;
            }
            window.addEventListener('ionScroll', this.handleScrollEvent);
            window.addEventListener('scroll', this.handleScrollEvent);
            window.addEventListener('resize', this.handleScrollEvent);
            if (screen.orientation) {
                screen.orientation.addEventListener('change', () => {
                    setTimeout(this.updateMapBounds, 500);
                });
            }
            else {
                window.addEventListener('orientationchange', () => {
                    setTimeout(this.updateMapBounds, 500);
                });
            }
        }
        disableScrolling() {
            window.removeEventListener('ionScroll', this.handleScrollEvent);
            window.removeEventListener('scroll', this.handleScrollEvent);
            window.removeEventListener('resize', this.handleScrollEvent);
            if (screen.orientation) {
                screen.orientation.removeEventListener('change', () => {
                    setTimeout(this.updateMapBounds, 1000);
                });
            }
            else {
                window.removeEventListener('orientationchange', () => {
                    setTimeout(this.updateMapBounds, 1000);
                });
            }
        }
        updateMapBounds() {
            if (this.element) {
                const mapRect = this.element.getBoundingClientRect();
                CapacitorGoogleMaps.onScroll({
                    id: this.id,
                    mapBounds: {
                        x: mapRect.x,
                        y: mapRect.y,
                        width: mapRect.width,
                        height: mapRect.height,
                    },
                });
            }
        }
        /*
        private findContainerElement(): HTMLElement | null {
          if (!this.element) {
            return null;
          }
      
          let parentElement = this.element.parentElement;
          while (parentElement !== null) {
            if (window.getComputedStyle(parentElement).overflowY !== 'hidden') {
              return parentElement;
            }
      
            parentElement = parentElement.parentElement;
          }
      
          return null;
        }
        */
        /**
         * Set the event listener on the map for 'onCameraIdle' events.
         *
         * @param callback
         * @returns
         */
        async setOnCameraIdleListener(callback) {
            if (this.onCameraIdleListener) {
                this.onCameraIdleListener.remove();
            }
            if (callback) {
                this.onCameraIdleListener = await CapacitorGoogleMaps.addListener('onCameraIdle', this.generateCallback(callback));
            }
            else {
                this.onCameraIdleListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onBoundsChanged' events.
         *
         * @param callback
         * @returns
         */
        async setOnBoundsChangedListener(callback) {
            if (this.onBoundsChangedListener) {
                this.onBoundsChangedListener.remove();
            }
            if (callback) {
                this.onBoundsChangedListener = await CapacitorGoogleMaps.addListener('onBoundsChanged', this.generateCallback(callback));
            }
            else {
                this.onBoundsChangedListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onCameraMoveStarted' events.
         *
         * @param callback
         * @returns
         */
        async setOnCameraMoveStartedListener(callback) {
            if (this.onCameraMoveStartedListener) {
                this.onCameraMoveStartedListener.remove();
            }
            if (callback) {
                this.onCameraMoveStartedListener = await CapacitorGoogleMaps.addListener('onCameraMoveStarted', this.generateCallback(callback));
            }
            else {
                this.onCameraMoveStartedListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onClusterClick' events.
         *
         * @param callback
         * @returns
         */
        async setOnClusterClickListener(callback) {
            if (this.onClusterClickListener) {
                this.onClusterClickListener.remove();
            }
            if (callback) {
                this.onClusterClickListener = await CapacitorGoogleMaps.addListener('onClusterClick', this.generateCallback(callback));
            }
            else {
                this.onClusterClickListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onClusterInfoWindowClick' events.
         *
         * @param callback
         * @returns
         */
        async setOnClusterInfoWindowClickListener(callback) {
            if (this.onClusterInfoWindowClickListener) {
                this.onClusterInfoWindowClickListener.remove();
            }
            if (callback) {
                this.onClusterInfoWindowClickListener = await CapacitorGoogleMaps.addListener('onClusterInfoWindowClick', this.generateCallback(callback));
            }
            else {
                this.onClusterInfoWindowClickListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onInfoWindowClick' events.
         *
         * @param callback
         * @returns
         */
        async setOnInfoWindowClickListener(callback) {
            if (this.onInfoWindowClickListener) {
                this.onInfoWindowClickListener.remove();
            }
            if (callback) {
                this.onInfoWindowClickListener = await CapacitorGoogleMaps.addListener('onInfoWindowClick', this.generateCallback(callback));
            }
            else {
                this.onInfoWindowClickListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onMapClick' events.
         *
         * @param callback
         * @returns
         */
        async setOnMapClickListener(callback) {
            if (this.onMapClickListener) {
                this.onMapClickListener.remove();
            }
            if (callback) {
                this.onMapClickListener = await CapacitorGoogleMaps.addListener('onMapClick', this.generateCallback(callback));
            }
            else {
                this.onMapClickListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onPolygonClick' events.
         *
         * @param callback
         * @returns
         */
        async setOnPolygonClickListener(callback) {
            if (this.onPolygonClickListener) {
                this.onPolygonClickListener.remove();
            }
            if (callback) {
                this.onPolygonClickListener = await CapacitorGoogleMaps.addListener('onPolygonClick', this.generateCallback(callback));
            }
            else {
                this.onPolygonClickListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onCircleClick' events.
         *
         * @param callback
         * @returns
         */
        async setOnCircleClickListener(callback) {
            if (this.onCircleClickListener)
                [this.onCircleClickListener.remove()];
            if (callback) {
                this.onCircleClickListener = await CapacitorGoogleMaps.addListener('onCircleClick', this.generateCallback(callback));
            }
            else {
                this.onCircleClickListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onMarkerClick' events.
         *
         * @param callback
         * @returns
         */
        async setOnMarkerClickListener(callback) {
            if (this.onMarkerClickListener) {
                this.onMarkerClickListener.remove();
            }
            if (callback) {
                this.onMarkerClickListener = await CapacitorGoogleMaps.addListener('onMarkerClick', this.generateCallback(callback));
            }
            else {
                this.onMarkerClickListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onPolylineClick' events.
         *
         * @param callback
         * @returns
         */
        async setOnPolylineClickListener(callback) {
            if (this.onPolylineClickListener) {
                this.onPolylineClickListener.remove();
            }
            if (callback) {
                this.onPolylineClickListener = await CapacitorGoogleMaps.addListener('onPolylineClick', this.generateCallback(callback));
            }
            else {
                this.onPolylineClickListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onMarkerDragStart' events.
         *
         * @param callback
         * @returns
         */
        async setOnMarkerDragStartListener(callback) {
            if (this.onMarkerDragStartListener) {
                this.onMarkerDragStartListener.remove();
            }
            if (callback) {
                this.onMarkerDragStartListener = await CapacitorGoogleMaps.addListener('onMarkerDragStart', this.generateCallback(callback));
            }
            else {
                this.onMarkerDragStartListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onMarkerDrag' events.
         *
         * @param callback
         * @returns
         */
        async setOnMarkerDragListener(callback) {
            if (this.onMarkerDragListener) {
                this.onMarkerDragListener.remove();
            }
            if (callback) {
                this.onMarkerDragListener = await CapacitorGoogleMaps.addListener('onMarkerDrag', this.generateCallback(callback));
            }
            else {
                this.onMarkerDragListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onMarkerDragEnd' events.
         *
         * @param callback
         * @returns
         */
        async setOnMarkerDragEndListener(callback) {
            if (this.onMarkerDragEndListener) {
                this.onMarkerDragEndListener.remove();
            }
            if (callback) {
                this.onMarkerDragEndListener = await CapacitorGoogleMaps.addListener('onMarkerDragEnd', this.generateCallback(callback));
            }
            else {
                this.onMarkerDragEndListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onMyLocationButtonClick' events.
         *
         * @param callback
         * @returns
         */
        async setOnMyLocationButtonClickListener(callback) {
            if (this.onMyLocationButtonClickListener) {
                this.onMyLocationButtonClickListener.remove();
            }
            if (callback) {
                this.onMyLocationButtonClickListener = await CapacitorGoogleMaps.addListener('onMyLocationButtonClick', this.generateCallback(callback));
            }
            else {
                this.onMyLocationButtonClickListener = undefined;
            }
        }
        /**
         * Set the event listener on the map for 'onMyLocationClick' events.
         *
         * @param callback
         * @returns
         */
        async setOnMyLocationClickListener(callback) {
            if (this.onMyLocationClickListener) {
                this.onMyLocationClickListener.remove();
            }
            if (callback) {
                this.onMyLocationClickListener = await CapacitorGoogleMaps.addListener('onMyLocationClick', this.generateCallback(callback));
            }
            else {
                this.onMyLocationClickListener = undefined;
            }
        }
        /**
         * Remove all event listeners on the map.
         *
         * @param callback
         * @returns
         */
        async removeAllMapListeners() {
            if (this.onBoundsChangedListener) {
                this.onBoundsChangedListener.remove();
                this.onBoundsChangedListener = undefined;
            }
            if (this.onCameraIdleListener) {
                this.onCameraIdleListener.remove();
                this.onCameraIdleListener = undefined;
            }
            if (this.onCameraMoveStartedListener) {
                this.onCameraMoveStartedListener.remove();
                this.onCameraMoveStartedListener = undefined;
            }
            if (this.onClusterClickListener) {
                this.onClusterClickListener.remove();
                this.onClusterClickListener = undefined;
            }
            if (this.onClusterInfoWindowClickListener) {
                this.onClusterInfoWindowClickListener.remove();
                this.onClusterInfoWindowClickListener = undefined;
            }
            if (this.onInfoWindowClickListener) {
                this.onInfoWindowClickListener.remove();
                this.onInfoWindowClickListener = undefined;
            }
            if (this.onMapClickListener) {
                this.onMapClickListener.remove();
                this.onMapClickListener = undefined;
            }
            if (this.onPolylineClickListener) {
                this.onPolylineClickListener.remove();
                this.onPolylineClickListener = undefined;
            }
            if (this.onMarkerClickListener) {
                this.onMarkerClickListener.remove();
                this.onMarkerClickListener = undefined;
            }
            if (this.onPolygonClickListener) {
                this.onPolygonClickListener.remove();
                this.onPolygonClickListener = undefined;
            }
            if (this.onCircleClickListener) {
                this.onCircleClickListener.remove();
                this.onCircleClickListener = undefined;
            }
            if (this.onMarkerDragStartListener) {
                this.onMarkerDragStartListener.remove();
                this.onMarkerDragStartListener = undefined;
            }
            if (this.onMarkerDragListener) {
                this.onMarkerDragListener.remove();
                this.onMarkerDragListener = undefined;
            }
            if (this.onMarkerDragEndListener) {
                this.onMarkerDragEndListener.remove();
                this.onMarkerDragEndListener = undefined;
            }
            if (this.onMyLocationButtonClickListener) {
                this.onMyLocationButtonClickListener.remove();
                this.onMyLocationButtonClickListener = undefined;
            }
            if (this.onMyLocationClickListener) {
                this.onMyLocationClickListener.remove();
                this.onMyLocationClickListener = undefined;
            }
        }
        generateCallback(callback) {
            const mapId = this.id;
            return (data) => {
                if (data.mapId == mapId) {
                    callback(data);
                }
            };
        }
    }

    class CapacitorGoogleMapsWeb extends core.WebPlugin {
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
            if (args.type === exports.FeatureType.GeoJSON) {
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
            this.maps[_args.id].markerClusterer = new markerclusterer.MarkerClusterer({
                map: this.maps[_args.id].map,
                markers: markers,
                algorithm: new markerclusterer.SuperClusterAlgorithm({
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

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        CapacitorGoogleMapsWeb: CapacitorGoogleMapsWeb
    });

    exports.GoogleMap = GoogleMap;
    exports.LatLngBounds = LatLngBounds;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({}, capacitorExports, markerclusterer);
//# sourceMappingURL=plugin.js.map
