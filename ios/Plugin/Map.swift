import Foundation
import GoogleMaps
import Capacitor
import GoogleMapsUtils

public struct LatLng: Codable {
    let lat: Double
    let lng: Double
}

class GMViewController: UIViewController {
    var mapViewBounds: [String: Double]!
    var GMapView: GMSMapView!
    var cameraPosition: [String: Double]!
    var minimumClusterSize: Int?
    var mapId: String?

    private var clusterManager: GMUClusterManager?

    var clusteringEnabled: Bool {
        return clusterManager != nil
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        let camera = GMSCameraPosition.camera(withLatitude: cameraPosition["latitude"] ?? 0, longitude: cameraPosition["longitude"] ?? 0, zoom: Float(cameraPosition["zoom"] ?? 12))
        let frame = CGRect(x: mapViewBounds["x"] ?? 0, y: mapViewBounds["y"] ?? 0, width: mapViewBounds["width"] ?? 0, height: mapViewBounds["height"] ?? 0)
        if let id = mapId {
            let gmsId = GMSMapID(identifier: id)
            self.GMapView = GMSMapView(frame: frame, mapID: gmsId, camera: camera)
        } else {
            self.GMapView = GMSMapView(frame: frame, camera: camera)
        }

        self.view = GMapView
    }

    func initClusterManager(_ minClusterSize: Int?) {
        let iconGenerator = GMUDefaultClusterIconGenerator()
        let algorithm = GMUNonHierarchicalDistanceBasedAlgorithm()
        let renderer = GMUDefaultClusterRenderer(mapView: self.GMapView, clusterIconGenerator: iconGenerator)
        self.minimumClusterSize = minClusterSize
        if let minClusterSize = minClusterSize {
            renderer.minimumClusterSize = UInt(minClusterSize)
        }
        self.clusterManager = GMUClusterManager(map: self.GMapView, algorithm: algorithm, renderer: renderer)
    }

    func destroyClusterManager() {
        self.clusterManager = nil
    }

    func addMarkersToCluster(markers: [GMSMarker]) {
        if let clusterManager = clusterManager {
            clusterManager.add(markers)
            clusterManager.cluster()
        }
    }

    func removeMarkersFromCluster(markers: [GMSMarker]) {
        if let clusterManager = clusterManager {
            markers.forEach { marker in
                clusterManager.remove(marker)
            }
            clusterManager.cluster()
        }
    }
}

// swiftlint:disable type_body_length
public class Map {
    var id: String
    var config: GoogleMapConfig
    var mapViewController: GMViewController
    var targetViewController: UIView?
    var markers = [Int: GMSMarker]()
    var polygons = [Int: GMSPolygon]()
    var circles = [Int: GMSCircle]()
    var polylines = [Int: GMSPolyline]()
    var features = [String: GMUGeometryRenderer]()
    var markerIcons = [String: UIImage]()

    // swiftlint:disable identifier_name
    public static let MAP_TAG = 99999
    // swiftlint:enable identifier_name

    // swiftlint:disable weak_delegate
    private var delegate: CapacitorGoogleMapsPlugin

    init(id: String, config: GoogleMapConfig, delegate: CapacitorGoogleMapsPlugin) {
        self.id = id
        self.config = config
        self.delegate = delegate
        self.mapViewController = GMViewController()
        self.mapViewController.mapId = config.mapId

        self.render()
    }

    func render() {
        DispatchQueue.main.async {
            self.mapViewController.mapViewBounds = [
                "width": self.config.width,
                "height": self.config.height,
                "x": self.config.x,
                "y": self.config.y
            ]

            self.mapViewController.cameraPosition = [
                "latitude": self.config.center.lat,
                "longitude": self.config.center.lng,
                "zoom": self.config.zoom
            ]

            self.targetViewController = self.getTargetContainer(refWidth: self.config.width, refHeight: self.config.height)

            if let target = self.targetViewController {
                target.tag = Map.MAP_TAG
                target.removeAllSubview()
                self.mapViewController.view.frame = target.bounds
                target.addSubview(self.mapViewController.view)
                self.mapViewController.GMapView.delegate = self.delegate
            }

            self.delegate.notifyListeners("onMapReady", data: [
                "mapId": self.id
            ])
        }
    }

    func updateRender(mapBounds: CGRect) {
        DispatchQueue.main.sync {
            let newWidth = round(Double(mapBounds.width))
            let newHeight = round(Double(mapBounds.height))
            let isWidthEqual = round(Double(self.mapViewController.view.bounds.width)) == newWidth
            let isHeightEqual = round(Double(self.mapViewController.view.bounds.height)) == newHeight

            if !isWidthEqual || !isHeightEqual {
                CATransaction.begin()
                CATransaction.setDisableActions(true)
                self.mapViewController.view.frame.size.width = newWidth
                self.mapViewController.view.frame.size.height = newHeight
                CATransaction.commit()
            }
        }
    }

    func rebindTargetContainer(mapBounds: CGRect) {
        DispatchQueue.main.sync {
            if let target = self.getTargetContainer(refWidth: round(Double(mapBounds.width)), refHeight: round(Double(mapBounds.height))) {
                self.targetViewController = target
                target.tag = Map.MAP_TAG
                target.removeAllSubview()
                CATransaction.begin()
                CATransaction.setDisableActions(true)
                self.mapViewController.view.frame.size.width = mapBounds.width
                self.mapViewController.view.frame.size.height = mapBounds.height
                CATransaction.commit()
                target.addSubview(self.mapViewController.view)
            }
        }
    }

    private func getTargetContainer(refWidth: Double, refHeight: Double) -> UIView? {
        if let bridge = self.delegate.bridge {
            for item in bridge.webView!.getAllSubViews() {
                let isScrollView = item.isKind(of: NSClassFromString("WKChildScrollView")!) || item.isKind(of: NSClassFromString("WKScrollView")!)
                let isBridgeScrollView = item.isEqual(bridge.webView?.scrollView)

                if isScrollView && !isBridgeScrollView {
                    (item as? UIScrollView)?.isScrollEnabled = true

                    let height = Double((item as? UIScrollView)?.contentSize.height ?? 0)
                    let width = Double((item as? UIScrollView)?.contentSize.width ?? 0)
                    let actualHeightFloor = floor(height / 2)
                    let actualHeightCeil = ceil(height / 2)

                    let isWidthEqual = width == refWidth
                    let isHeightEqual = actualHeightFloor == refHeight || actualHeightCeil == refHeight

                    if isWidthEqual && isHeightEqual && item.tag < self.targetViewController?.tag ?? Map.MAP_TAG {
                        return item
                    }
                }
            }
        }

        return nil
    }

    func applyConfig(configObj: JSObject) {
        DispatchQueue.main.async {
            if (configObj as [String: Any]).keys.contains("gestureHandling"), let gestureHandling = configObj["gestureHandling"] as? String {
                self.mapViewController.GMapView.settings.consumesGesturesInView = gestureHandling != "none"
            }

            if (configObj as [String: Any]).keys.contains("isAccessibilityElementsEnabled"), let isAccessibilityElementsEnabled = configObj["isAccessibilityElementsEnabled"] as? Bool {
                self.mapViewController.GMapView.accessibilityElementsHidden = isAccessibilityElementsEnabled
            }

            if (configObj as [String: Any]).keys.contains("isCompassEnabled"), let isCompassEnabled = configObj["isCompassEnabled"] as? Bool {
                self.mapViewController.GMapView.settings.compassButton = isCompassEnabled
            }

            if (configObj as [String: Any]).keys.contains("isIndoorMapsEnabled"), let isIndoorMapsEnabled = configObj["isIndoorMapsEnabled"] as? Bool {
                self.mapViewController.GMapView.isIndoorEnabled = isIndoorMapsEnabled
            }

            if (configObj as [String: Any]).keys.contains("isMyLocationButtonEnabled"), let isMyLocationButtonEnabled = configObj["isMyLocationButtonEnabled"] as? Bool {
                self.mapViewController.GMapView.settings.myLocationButton = isMyLocationButtonEnabled
            }

            if (configObj as [String: Any]).keys.contains("isMyLocationEnabled"), let isMyLocationEnabled = configObj["isMyLocationEnabled"] as? Bool {
                self.mapViewController.GMapView.isMyLocationEnabled = isMyLocationEnabled
            }

            if (configObj as [String: Any]).keys.contains("isRotateGesturesEnabled"), let isRotateGesturesEnabled = configObj["isRotateGesturesEnabled"] as? Bool {
                self.mapViewController.GMapView.settings.rotateGestures = isRotateGesturesEnabled
            }

            if (configObj as [String: Any]).keys.contains("isTiltGesturesEnabled"), let isTiltGesturesEnabled = configObj["isTiltGesturesEnabled"] as? Bool {
                self.mapViewController.GMapView.settings.tiltGestures = isTiltGesturesEnabled
            }

            if (configObj as [String: Any]).keys.contains("isTrafficLayerEnabled"), let isTrafficLayerEnabled = configObj["isTrafficLayerEnabled"] as? Bool {
                self.mapViewController.GMapView.isTrafficEnabled = isTrafficLayerEnabled
            }

            if (configObj as [String: Any]).keys.contains("isZoomGesturesEnabled"), let isZoomGesturesEnabled = configObj["isZoomGesturesEnabled"] as? Bool {
                self.mapViewController.GMapView.settings.zoomGestures = isZoomGesturesEnabled
            }

            if (configObj as [String: Any]).keys.contains("mapTypeId"), let mapTypeId = configObj["mapTypeId"] as? String {
                self.setMapType(mapTypeId: mapTypeId)
            }

            if (configObj as [String: Any]).keys.contains("maxZoom"), let maxZoom = configObj["maxZoom"] as? Float {
                self.mapViewController.GMapView.setMinZoom(self.mapViewController.GMapView.minZoom, maxZoom: maxZoom)
            }

            if (configObj as [String: Any]).keys.contains("minZoom"), let minZoom = configObj["minZoom"] as? Float {
                self.mapViewController.GMapView.setMinZoom(minZoom, maxZoom: self.mapViewController.GMapView.maxZoom)
            }

            if (configObj as [String: Any]).keys.contains("padding"), let paddingObj = configObj["padding"] as? JSObject {
                self.setPadding(paddingObj: paddingObj)
            }

            if (configObj as [String: Any]).keys.contains("restriction") {
                let restrictionObj = (configObj as [String: Any])["restriction"] as? JSObject
                self.setRestriction(restrictionObj: restrictionObj)
            }

            if (configObj as [String: Any]).keys.contains("styles"), let stylesObj = (configObj as [String: Any])["styles"] as? JSArray {
                self.setStyle(stylesObj: stylesObj)
            }
        }
    }

    private func setMapType(mapTypeId: String) {
        let mapType = GMSMapViewType.fromString(mapType: mapTypeId)
        self.mapViewController.GMapView.mapType = mapType
    }

    private func setPadding(paddingObj: JSObject) {
        if let padding = try? GoogleMapPadding.init(fromJSObject: paddingObj) {
            let mapInsets = UIEdgeInsets(top: CGFloat(padding.top), left: CGFloat(padding.left), bottom: CGFloat(padding.bottom), right: CGFloat(padding.right))
            self.mapViewController.GMapView.padding = mapInsets
        }
    }

    private func setRestriction(restrictionObj: JSObject?) {
        let latLngBounds = restrictionObj?["latLngBounds"] as? JSObject
        var bounds: GMSCoordinateBounds? = nil

        if latLngBounds != nil {
            bounds = try? getGMSCoordinateBoundsFromGMSJS(latLngBounds!)
        }

        self.mapViewController.GMapView.setMinZoom(kGMSMinZoomLevel, maxZoom: kGMSMaxZoomLevel)
        self.mapViewController.GMapView.cameraTargetBounds = nil

        if (bounds != nil) {
            CATransaction.begin()
            CATransaction.setCompletionBlock({
                self.mapViewController.GMapView.setMinZoom(self.mapViewController.GMapView.camera.zoom, maxZoom: kGMSMaxZoomLevel)
                self.mapViewController.GMapView.cameraTargetBounds = bounds
            })
            self.mapViewController.GMapView.animate(with: GMSCameraUpdate.fit(bounds!))
            CATransaction.commit()
        }
    }

    private func setStyle(stylesObj: JSArray) {
        if let jsonData = try? JSONSerialization.data(withJSONObject: stylesObj, options: []) {
            let stylesString = String(data: jsonData, encoding: .utf8)
            self.mapViewController.GMapView.mapStyle = try? GMSMapStyle(jsonString: stylesString!)
        }
    }

    func destroy() {
        DispatchQueue.main.async {
            self.mapViewController.GMapView = nil
            self.targetViewController?.tag = 0
            self.mapViewController.view = nil
            self.enableTouch()
        }
    }

    func enableTouch() {
        DispatchQueue.main.async {
            if let target = self.targetViewController, let itemIndex = WKWebView.disabledTargets.firstIndex(of: target) {
                WKWebView.disabledTargets.remove(at: itemIndex)
            }
        }
    }

    func disableTouch() {
        DispatchQueue.main.async {
            if let target = self.targetViewController, !WKWebView.disabledTargets.contains(target) {
                WKWebView.disabledTargets.append(target)
            }
        }
    }

    func addMarker(marker: Marker) throws -> Int {
        var markerHash = 0

        DispatchQueue.main.sync {
            let newMarker = self.buildMarker(marker: marker)

            if self.mapViewController.clusteringEnabled {
                self.mapViewController.addMarkersToCluster(markers: [newMarker])
            } else {
                newMarker.map = self.mapViewController.GMapView
            }

            self.markers[newMarker.hash.hashValue] = newMarker

            markerHash = newMarker.hash.hashValue
        }

        return markerHash
    }

    func addMarkers(markers: [Marker]) throws -> [Int] {
        var markerHashes: [Int] = []

        DispatchQueue.main.sync {
            var googleMapsMarkers: [GMSMarker] = []

            markers.forEach { marker in
                let newMarker = self.buildMarker(marker: marker)

                if self.mapViewController.clusteringEnabled {
                    googleMapsMarkers.append(newMarker)
                } else {
                    newMarker.map = self.mapViewController.GMapView
                }

                self.markers[newMarker.hash.hashValue] = newMarker

                markerHashes.append(newMarker.hash.hashValue)
            }

            if self.mapViewController.clusteringEnabled {
                self.mapViewController.addMarkersToCluster(markers: googleMapsMarkers)
            }
        }

        return markerHashes
    }

    func addPolygons(polygons: [Polygon]) throws -> [Int] {
        var polygonHashes: [Int] = []

        DispatchQueue.main.sync {
            polygons.forEach { polygon in
                let newPolygon = self.buildPolygon(polygon: polygon)
                newPolygon.map = self.mapViewController.GMapView

                self.polygons[newPolygon.hash.hashValue] = newPolygon

                polygonHashes.append(newPolygon.hash.hashValue)
            }
        }

        return polygonHashes
    }

    func addCircles(circles: [Circle]) throws -> [Int] {
        var circleHashes: [Int] = []

        DispatchQueue.main.sync {
            circles.forEach { circle in
                let newCircle = self.buildCircle(circle: circle)
                newCircle.map = self.mapViewController.GMapView

                self.circles[newCircle.hash.hashValue] = newCircle

                circleHashes.append(newCircle.hash.hashValue)
            }
        }

        return circleHashes
    }

    func addPolylines(lines: [Polyline]) throws -> [Int] {
        var polylineHashes: [Int] = []

        DispatchQueue.main.sync {
            lines.forEach { line in
                let newLine = self.buildPolyline(line: line)
                newLine.map = self.mapViewController.GMapView

                self.polylines[newLine.hash.hashValue] = newLine

                polylineHashes.append(newLine.hash.hashValue)
            }
        }

        return polylineHashes
    }

    func enableClustering(_ minClusterSize: Int?) {
        if !self.mapViewController.clusteringEnabled {
            DispatchQueue.main.sync {
                self.mapViewController.initClusterManager(minClusterSize)

                // add existing markers to the cluster
                if !self.markers.isEmpty {
                    var existingMarkers: [GMSMarker] = []
                    for (_, marker) in self.markers {
                        marker.map = nil
                        existingMarkers.append(marker)
                    }

                    self.mapViewController.addMarkersToCluster(markers: existingMarkers)
                }
            }
        } else if self.mapViewController.minimumClusterSize != minClusterSize {
            self.mapViewController.destroyClusterManager()
            enableClustering(minClusterSize)
        }
    }

    func disableClustering() {
        DispatchQueue.main.sync {
            self.mapViewController.destroyClusterManager()

            // add existing markers back to the map
            if !self.markers.isEmpty {
                for (_, marker) in self.markers {
                    marker.map = self.mapViewController.GMapView
                }
            }
        }
    }

    func removeMarker(id: Int) throws {
        if let marker = self.markers[id] {
            DispatchQueue.main.async {
                if self.mapViewController.clusteringEnabled {
                    self.mapViewController.removeMarkersFromCluster(markers: [marker])
                }

                marker.map = nil
                self.markers.removeValue(forKey: id)

            }
        } else {
            throw GoogleMapErrors.markerNotFound
        }
    }

    func removePolygons(ids: [Int]) throws {
        DispatchQueue.main.sync {
            ids.forEach { id in
                if let polygon = self.polygons[id] {
                    polygon.map = nil
                    self.polygons.removeValue(forKey: id)
                }
            }
        }
    }

    func removeCircles(ids: [Int]) throws {
        DispatchQueue.main.sync {
            ids.forEach { id in
                if let circle = self.circles[id] {
                    circle.map = nil
                    self.circles.removeValue(forKey: id)
                }
            }
        }
    }

    func removePolylines(ids: [Int]) throws {
        DispatchQueue.main.sync {
            ids.forEach { id in
                if let line = self.polylines[id] {
                    line.map = nil
                    self.polylines.removeValue(forKey: id)
                }
            }
        }
    }

    func addFeatures(type: String, data: JSObject, idPropertyName: String?, styles: JSObject?) throws -> [String] {
        var featureIds: [String] = []

        DispatchQueue.main.sync {
            let jsonData : Data = try! JSONSerialization.data(withJSONObject: data, options: [])
            let geoJSONParser = GMUGeoJSONParser(data: jsonData)
            geoJSONParser.parse()

            for container in geoJSONParser.features {
                if let tempFeature = container as? GMUFeature, let propertes = tempFeature.properties {
                    var featureId: String? = nil
                    if (idPropertyName != nil) {
                        featureId = propertes[idPropertyName!] as? String

                        if (featureId != nil) {
                            if let renderer = self.features[featureId!] {
                                renderer.clear()
                                self.features.removeValue(forKey: featureId!)
                            }
                        }
                    }

                    let feature = GMUFeature(geometry: tempFeature.geometry, identifier: featureId, properties: tempFeature.properties, boundingBox: nil)

                    if (featureId != nil) {
                        featureIds.append(featureId!)
                    }

                    if (featureId != nil && styles != nil) {
                        if let stylesData = (styles! as [String: Any])[featureId!] as? [String: Any] {
                            if let strokeColor = stylesData["strokeColor"] as? String,
                               let strokeOpacity = stylesData["strokeOpacity"] as? Double,
                               let stroke = UIColor.init(hex: strokeColor)?.withAlphaComponent(strokeOpacity),
                               let fillColor = stylesData["fillColor"] as? String,
                               let fillOpacity = stylesData["fillOpacity"] as? Double,
                               let fill = UIColor.init(hex: fillColor)?.withAlphaComponent(fillOpacity)
                            {
                                let style = GMUStyle(styleID: "styleId", stroke: stroke, fill: fill, width: stylesData["strokeWeight"] as? Double ?? 1, scale: 2, heading: 0, anchor: CGPoint(x: 0, y: 0), iconUrl: nil, title: nil, hasFill: true, hasStroke: true)
                                feature.style = style
                            }
                        }
                    }

                    let renderer = GMUGeometryRenderer(map: self.mapViewController.GMapView, geometries: [feature])
                    renderer.render()

                    if (featureId != nil) {
                        self.features[featureId!] = renderer
                    }
                }
            }
        }

        return featureIds
    }

    func getFeatureBounds(featureId: String) throws -> GMSCoordinateBounds {
        if let renderer = self.features[featureId] {
            var bounds: GMSCoordinateBounds!

            DispatchQueue.main.sync {
                bounds = renderer.getBounds()
            }

            return bounds
        } else {
            throw GoogleMapErrors.unhandledError("feature not found")
        }
    }

    func removeFeature(featureId: String) throws {
        if let renderer = self.features[featureId] {
            DispatchQueue.main.async {
                renderer.clear()
                self.features.removeValue(forKey: featureId)
            }
        } else {
            throw GoogleMapErrors.unhandledError("feature not found")
        }
    }

    func setCamera(config: GoogleMapCameraConfig) throws {
        let currentCamera = self.mapViewController.GMapView.camera

        let lat = config.coordinate?.lat ?? currentCamera.target.latitude
        let lng = config.coordinate?.lng ?? currentCamera.target.longitude

        let zoom = config.zoom ?? currentCamera.zoom
        let bearing = config.bearing ?? Double(currentCamera.bearing)
        let angle = config.angle ?? currentCamera.viewingAngle

        let animate = config.animate ?? false

        DispatchQueue.main.sync {
            let newCamera = GMSCameraPosition(latitude: lat, longitude: lng, zoom: zoom, bearing: bearing, viewingAngle: angle)

            if animate {
                self.mapViewController.GMapView.animate(to: newCamera)
            } else {
                self.mapViewController.GMapView.camera = newCamera
            }
        }

    }

    func removeMarkers(ids: [Int]) throws {
        DispatchQueue.main.sync {
            var markers: [GMSMarker] = []
            ids.forEach { id in
                if let marker = self.markers[id] {
                    marker.map = nil
                    self.markers.removeValue(forKey: id)
                    markers.append(marker)
                }
            }

            if self.mapViewController.clusteringEnabled {
                self.mapViewController.removeMarkersFromCluster(markers: markers)
            }
        }
    }

    func getMapLatLngBounds() -> GMSCoordinateBounds? {
        return GMSCoordinateBounds(region: self.mapViewController.GMapView.projection.visibleRegion())
    }

    func fitBounds(bounds: GMSCoordinateBounds, padding: CGFloat) {
        DispatchQueue.main.sync {
            let cameraUpdate = GMSCameraUpdate.fit(bounds, withPadding: padding)
            self.mapViewController.GMapView.animate(with: cameraUpdate)
        }
    }

    private func getGMSCoordinateBoundsFromGMSJS(_ bounds: JSObject) throws -> GMSCoordinateBounds {
        guard let south = bounds["south"] as? Double, let west = bounds["west"] as? Double, let north = bounds["north"] as? Double, let east = bounds["east"] as? Double else {
            throw GoogleMapErrors.unhandledError("Bounds not formatted properly.")
        }

        return GMSCoordinateBounds(
            coordinate: CLLocationCoordinate2D(latitude: south, longitude: west),
            coordinate: CLLocationCoordinate2D(latitude: north, longitude: east)
        )
    }

    private func getFrameOverflowBounds(frame: CGRect, mapBounds: CGRect) -> [CGRect] {
        var intersections: [CGRect] = []

        // get top overflow
        if mapBounds.origin.y < frame.origin.y {
            let height = frame.origin.y - mapBounds.origin.y
            let width = mapBounds.width
            intersections.append(CGRect(x: 0, y: 0, width: width, height: height))
        }

        // get bottom overflow
        if (mapBounds.origin.y + mapBounds.height) > (frame.origin.y + frame.height) {
            let height = (mapBounds.origin.y + mapBounds.height) - (frame.origin.y + frame.height)
            let width = mapBounds.width
            intersections.append(CGRect(x: 0, y: mapBounds.height, width: width, height: height))
        }

        return intersections
    }

    private func buildCircle(circle: Circle) -> GMSCircle {
        let newCircle = GMSCircle()
        newCircle.title = circle.title
        newCircle.strokeColor = circle.strokeColor
        newCircle.strokeWidth = circle.strokeWidth
        newCircle.fillColor = circle.fillColor
        newCircle.position = CLLocationCoordinate2D(latitude: circle.center.lat, longitude: circle.center.lng)
        newCircle.radius = CLLocationDistance(circle.radius)
        newCircle.isTappable = circle.tappable ?? false
        newCircle.zIndex = circle.zIndex
        newCircle.userData = circle.tag

        return newCircle
    }

    private func buildPolygon(polygon: Polygon) -> GMSPolygon {
        let newPolygon = GMSPolygon()
        newPolygon.title = polygon.title
        newPolygon.strokeColor = polygon.strokeColor
        newPolygon.strokeWidth = polygon.strokeWidth
        newPolygon.fillColor = polygon.fillColor
        newPolygon.isTappable = polygon.tappable ?? false
        newPolygon.geodesic = polygon.geodesic ?? false
        newPolygon.zIndex = polygon.zIndex
        newPolygon.userData = polygon.tag

        var shapeIndex = 0
        let outerShape = GMSMutablePath()
        var holes: [GMSMutablePath] = []

        polygon.shapes.forEach { shape in
            if shapeIndex == 0 {
                shape.forEach { coord in
                    outerShape.add(CLLocationCoordinate2D(latitude: coord.lat, longitude: coord.lng))
                }
            } else {
                let holeShape = GMSMutablePath()
                shape.forEach { coord in
                    holeShape.add(CLLocationCoordinate2D(latitude: coord.lat, longitude: coord.lng))
                }

                holes.append(holeShape)
            }

            shapeIndex += 1
        }

        newPolygon.path = outerShape
        newPolygon.holes = holes

        return newPolygon
    }

    private func buildPolyline(line: Polyline) -> GMSPolyline {
        let newPolyline = GMSPolyline()
        newPolyline.title = line.title
        newPolyline.strokeColor = line.strokeColor
        newPolyline.strokeWidth = line.strokeWidth
        newPolyline.isTappable = line.tappable ?? false
        newPolyline.geodesic = line.geodesic ?? false
        newPolyline.zIndex = line.zIndex
        newPolyline.userData = line.tag

        let path = GMSMutablePath()
        line.path.forEach { coord in
            path.add(CLLocationCoordinate2D(latitude: coord.lat, longitude: coord.lng))
        }

        newPolyline.path = path

        if line.styleSpans.count > 0 {
            var spans: [GMSStyleSpan] = []

            line.styleSpans.forEach { span in
                if let segments = span.segments {
                    spans.append(GMSStyleSpan(color: span.color, segments: segments))
                } else {
                    spans.append(GMSStyleSpan(color: span.color))
                }
            }

            newPolyline.spans = spans
        }

        return newPolyline
    }

    private func buildMarker(marker: Marker) -> GMSMarker {
        let newMarker = GMSMarker()
        newMarker.position = CLLocationCoordinate2D(latitude: marker.coordinate.lat, longitude: marker.coordinate.lng)
        newMarker.title = marker.title
        newMarker.snippet = marker.snippet
        newMarker.isFlat = marker.isFlat ?? false
        newMarker.opacity = marker.opacity ?? 1
        newMarker.isDraggable = marker.draggable ?? false
        newMarker.zIndex = marker.zIndex
        if let iconAnchor = marker.iconAnchor {
            newMarker.groundAnchor = iconAnchor
        }

        // cache and reuse marker icon uiimages
        if let iconUrl = marker.iconUrl {
            if let iconImage = self.markerIcons[iconUrl] {
                newMarker.icon = getResizedIcon(iconImage, marker)
            } else {
                if iconUrl.starts(with: "https:") {
                    if let url = URL(string: iconUrl) {
                        URLSession.shared.dataTask(with: url) { (data, _, _) in
                            DispatchQueue.main.async {
                                if let data = data, let iconImage = UIImage(data: data) {
                                    self.markerIcons[iconUrl] = iconImage
                                    newMarker.icon = getResizedIcon(iconImage, marker)
                                }
                            }
                        }.resume()
                    }
                } else if let iconImage = UIImage(named: "public/\(iconUrl)") {
                    self.markerIcons[iconUrl] = iconImage
                    newMarker.icon = getResizedIcon(iconImage, marker)
                } else {
                    var detailedMessage = ""

                    if iconUrl.hasSuffix(".svg") {
                        detailedMessage = "SVG not supported."
                    }

                    print("CapacitorGoogleMaps Warning: could not load image '\(iconUrl)'. \(detailedMessage)  Using default marker icon.")
                }
            }
        } else {
            if let color = marker.color {
                newMarker.icon = GMSMarker.markerImage(with: color)
            }
        }

        return newMarker
    }
}

private func getResizedIcon(_ iconImage: UIImage, _ marker: Marker) -> UIImage? {
    if let iconSize = marker.iconSize {
        return iconImage.resizeImageTo(size: iconSize)
    } else {
        return iconImage
    }
}

extension WKWebView {
    static var disabledTargets: [UIView] = []

    override open func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        var hitView = super.hitTest(point, with: event)

        if let tempHitView = hitView, WKWebView.disabledTargets.contains(tempHitView) {
            return nil
        }

        if let typeClass = NSClassFromString("WKChildScrollView"), let tempHitView = hitView, tempHitView.isKind(of: typeClass) {
            for item in tempHitView.subviews.reversed() {
                let convertPoint = item.convert(point, from: self)
                if let hitTestView = item.hitTest(convertPoint, with: event) {
                    hitView = hitTestView
                    break
                }
            }
        }

        return hitView
    }
}

extension UIView {
    private static var allSubviews: [UIView] = []

    private func viewArray(root: UIView) -> [UIView] {
        var index = root.tag
        for view in root.subviews {
            if view.tag == Map.MAP_TAG {
                // view already in use as in map
                continue
            }

            // tag the index depth of the uiview
            view.tag = index

            if view.isKind(of: UIView.self) {
                UIView.allSubviews.append(view)
            }
            _ = viewArray(root: view)

            index += 1
        }
        return UIView.allSubviews
    }

    fileprivate func getAllSubViews() -> [UIView] {
        UIView.allSubviews = []
        return viewArray(root: self).reversed()
    }

    fileprivate func removeAllSubview() {
        subviews.forEach {
            $0.removeFromSuperview()
        }
    }
}

extension UIImage {
    func resizeImageTo(size: CGSize) -> UIImage? {
        UIGraphicsBeginImageContextWithOptions(size, false, 0.0)
        self.draw(in: CGRect(origin: CGPoint.zero, size: size))
        let resizedImage = UIGraphicsGetImageFromCurrentImageContext()!
        UIGraphicsEndImageContext()
        return resizedImage
    }
}

extension GMUGeometryRenderer {
    func getBounds() -> GMSCoordinateBounds {
        var bounds = GMSCoordinateBounds.init()

        for overlay in self.mapOverlays() {
            if let circle = overlay as? GMSCircle {
                bounds = bounds.includingBounds(circle.getBounds())
            }
            if let groundOverlay = overlay as? GMSGroundOverlay, let groundOverlayBounds = groundOverlay.bounds {
                bounds = bounds.includingBounds(groundOverlayBounds)
            }
            if let marker = overlay as? GMSMarker {
                bounds = bounds.includingCoordinate(marker.position)
            }
            if let polygon = overlay as? GMSPolygon, let polygonPath = polygon.path {
                bounds = bounds.includingPath(polygonPath)
            }
            if let polyline = overlay as? GMSPolyline, let polylinePath = polyline.path {
                bounds = bounds.includingPath(polylinePath)
            }
        }

        return bounds
    }
}

extension GMSCircle {
    func getBounds() -> GMSCoordinateBounds {
        var bounds = GMSCoordinateBounds.init(
            coordinate: GMSGeometryOffset(self.position, self.radius * sqrt(2.0), 225),
            coordinate: GMSGeometryOffset(self.position, self.radius * sqrt(2.0), 45)
        )
        return bounds
    }
}