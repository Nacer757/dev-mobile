import { registerRootComponent } from 'expo';

// Guard to avoid React DevTools attaching before ExceptionsManager and mutating console.error
if (__DEV__) {
  try {
    if (typeof global.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
      global.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
    }
  } catch (e) {
    // ignore
  }
}

// Require App after setting hook so DevTools cannot mutate console.error args before ExceptionsManager installs
const App = require('./App').default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
