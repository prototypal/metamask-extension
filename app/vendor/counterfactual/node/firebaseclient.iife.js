(function (exports, firebase, log) {
  'use strict';

  firebase = firebase && firebase.hasOwnProperty('default') ? firebase['default'] : firebase;
  log = log && log.hasOwnProperty('default') ? log['default'] : log;

  const WRITE_NULL_TO_FIREBASE = `The records being set contain null/undefined values. If this is intentional, pass the allowDelete flag in set.`;
  const FIREBASE_CONFIGURATION_ENV_KEYS = {
      apiKey: "FIREBASE_API_KEY",
      authDomain: "FIREBASE_AUTH_DOMAIN",
      databaseURL: "FIREBASE_DATABASE_URL",
      projectId: "FIREBASE_PROJECT_ID",
      storageBucket: "FIREBASE_STORAGE_BUCKET",
      messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
      authEmail: "FIREBASE_AUTH_EMAIL",
      authPassword: "FIREBASE_AUTH_PASSWORD"
  };
  const EMPTY_FIREBASE_CONFIG = {
      apiKey: "",
      authDomain: "",
      databaseURL: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: ""
  };
  class FirebaseServiceFactory {
      constructor(configuration) {
          this.app = firebase.initializeApp(configuration);
      }
      static connect(host, port) {
          return new FirebaseServiceFactory(Object.assign({}, EMPTY_FIREBASE_CONFIG, { databaseURL: `ws://${host}:${port}` }));
      }
      async auth(email, password) {
          try {
              log.info(`Authenticating with email: ${email}`);
              await this.app.auth().signInWithEmailAndPassword(email, password);
          }
          catch (e) {
              log.error(`Error authenticating against Firebase with email: ${email}`);
              console.error(e);
          }
      }
      createMessagingService(messagingServiceKey) {
          return new FirebaseMessagingService(this.app.database(), messagingServiceKey);
      }
      createStoreService(storeServiceKey) {
          return new FirebaseStoreService(this.app.database(), storeServiceKey);
      }
  }
  class FirebaseMessagingService {
      constructor(firebase, messagingServerKey) {
          this.firebase = firebase;
          this.messagingServerKey = messagingServerKey;
      }
      async send(to, msg) {
          await this.firebase
              .ref(`${this.messagingServerKey}/${to}/${msg.from}`)
              .set(JSON.parse(JSON.stringify(msg)));
      }
      onReceive(address, callback) {
          if (!this.firebase.app) {
              console.error("Cannot register a connection with an uninitialized firebase handle");
              return;
          }
          const childAddedHandler = async (snapshot) => {
              if (!snapshot) {
                  console.error(`Node with address ${address} received a "null" snapshot`);
                  return;
              }
              const msg = snapshot.val();
              if (msg === null) {
                  return;
              }
              await this.firebase
                  .ref(`${this.messagingServerKey}/${address}/${msg.from}`)
                  .remove();
              try {
                  callback(msg);
              }
              catch (error) {
                  console.error("Encountered an error while handling message callback", error);
              }
          };
          this.firebase.ref(`${this.messagingServerKey}/${address}`).remove();
          this.firebase
              .ref(`${this.messagingServerKey}/${address}`)
              .on("child_added", childAddedHandler);
      }
  }
  function containsNull(obj) {
      for (const key in obj) {
          if (typeof obj[key] === "object") {
              if (containsNull(obj[key])) {
                  return true;
              }
          }
          if (obj[key] === null || obj[key] === undefined) {
              return true;
          }
      }
      return false;
  }
  class FirebaseStoreService {
      constructor(firebase, storeServiceKey) {
          this.firebase = firebase;
          this.storeServiceKey = storeServiceKey;
      }
      async get(key) {
          let result;
          await this.firebase
              .ref(this.storeServiceKey)
              .child(key)
              .once("value", (snapshot) => {
              if (snapshot === null) {
                  console.debug(`Failed to retrieve value at ${key}: received a "null" snapshot`);
                  return;
              }
              result = snapshot.val();
          });
          return result;
      }
      async set(pairs, allowDelete) {
          const updates = {};
          for (const pair of pairs) {
              updates[pair.key] = JSON.parse(JSON.stringify(pair.value));
          }
          if (!allowDelete && containsNull(updates)) {
              throw new Error(WRITE_NULL_TO_FIREBASE);
          }
          return await this.firebase.ref(this.storeServiceKey).update(updates);
      }
  }
  const devAndTestingEnvironments = new Set(["development", "test"]);
  function confirmFirebaseConfigurationEnvVars() {
      for (const key of Object.keys(FIREBASE_CONFIGURATION_ENV_KEYS)) {
          if (!process.env[FIREBASE_CONFIGURATION_ENV_KEYS[key]]) {
              throw new Error(`Firebase ${key} is not set via env var ${FIREBASE_CONFIGURATION_ENV_KEYS[key]}`);
          }
      }
  }
  function confirmLocalFirebaseConfigurationEnvVars() {
      if (!process.env.FIREBASE_SERVER_HOST || !process.env.FIREBASE_SERVER_PORT) {
          throw new Error("Firebase server hostname and port number must be set via FIREBASE_SERVER_HOST and FIREBASE_SERVER_PORT env vars");
      }
  }

  exports.EMPTY_FIREBASE_CONFIG = EMPTY_FIREBASE_CONFIG;
  exports.FIREBASE_CONFIGURATION_ENV_KEYS = FIREBASE_CONFIGURATION_ENV_KEYS;
  exports.FirebaseServiceFactory = FirebaseServiceFactory;
  exports.WRITE_NULL_TO_FIREBASE = WRITE_NULL_TO_FIREBASE;
  exports.confirmFirebaseConfigurationEnvVars = confirmFirebaseConfigurationEnvVars;
  exports.confirmLocalFirebaseConfigurationEnvVars = confirmLocalFirebaseConfigurationEnvVars;
  exports.devAndTestingEnvironments = devAndTestingEnvironments;

}(this.window = this.window || {}, firebase, log));
//# sourceMappingURL=index.iife.js.map
