#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro, and
// each method the plugin supports using the CAP_PLUGIN_METHOD macro.
CAP_PLUGIN(CapacitorGoogleMapsPlugin, "CapacitorGoogleMaps",
   CAP_PLUGIN_METHOD(create, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(update, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(enableTouch, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(disableTouch, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(addMarker, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(addMarkers, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(addPolygons, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(addPolylines, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(addCircles, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(removeMarker, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(removeMarkers, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(removeCircles, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(removePolygons, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(removePolylines, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(enableClustering, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(disableClustering, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(destroy, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(addFeatures, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(getFeatureBounds, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(removeFeature, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(setCamera, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(onScroll, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(onResize, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(onDisplay, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(getMapBounds, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(fitBounds, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(mapBoundsContains, CAPPluginReturnPromise);
   CAP_PLUGIN_METHOD(mapBoundsExtend, CAPPluginReturnPromise);
)
