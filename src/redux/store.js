import { combineReducers, configureStore } from "@reduxjs/toolkit";
import topicReducer from "./topic/topicSlice";
import messageReducer from "./message/messageSlice";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from "redux-persist";
import storage from 'redux-persist/lib/storage';

const persistConfig = {
  key: 'root',
  version: 2,
  storage,
  blacklist: ['message']
}
const rootReducer = combineReducers({
  topic: topicReducer,
  message: messageReducer,
})
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  // devTools: composeWithDevTools(),
})
export const persistor = persistStore(store);

export default store;
