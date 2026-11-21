import { createElement } from 'react';
import { registerRootComponent } from 'expo';

import App from './App';
import { CustomerView } from './components/CustomerView';
import { tokenFromLocation } from './lib/customerLink';

// On the web build, /k/<token> is the customer's page (no staff login).
const customerToken = tokenFromLocation();

function Root() {
  return customerToken ? createElement(CustomerView, { token: customerToken }) : createElement(App);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
