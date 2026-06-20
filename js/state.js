// js/state.js
const AppState = {
  user: null,
  session: null,
  currentView: 'login',
  loans: [],
  repayments: [],
  profile: null,
  clientType: 'individual',
  currentApp: {
    amount: 0,
    term: 6,
    purpose: '',
    totalRepayable: 0,
    installment: 0,
    applicationId: null,
    uploadedDocs: {}
  },
  subscribers: [],

  setState(newState) {
    Object.assign(this, newState);
    this.subscribers.forEach(fn => fn(this));
  },

  subscribe(fn) {
    this.subscribers.push(fn);
    fn(this);
  }
};

window.AppState = AppState;
console.log('✅ AppState ready');

