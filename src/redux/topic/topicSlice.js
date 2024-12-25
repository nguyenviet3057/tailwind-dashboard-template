import { createSlice } from "@reduxjs/toolkit";

// Giá trị ban đầu của state
const initialState = {
	checkedTopics: [],
	currentIndex: undefined,
	uncheckedTopics: [],
};

// Tạo slice cho counter
const topicSlice = createSlice({
	name: "topic",
	initialState,
	reducers: {
		setCheckedTopics: (state, action) => {
			state.checkedTopics = action.payload;
		},
		addCheckedTopic: (state, action) => {
			state.checkedTopics = [...state.checkedTopics, action.payload];
			state.uncheckedTopics = [...state.uncheckedTopics.filter(topic => topic.name !== action.payload.name)];
		},
		setCurrentIndex: (state, action) => {
			state.currentIndex = action.payload;
		},
		setUncheckedTopics: (state, action) => {
			state.uncheckedTopics = action.payload;
		},
		addAllUncheckedTopics: (state, action) => {
			state.uncheckedTopics = [...state.uncheckedTopics, ...action.payload];
		},
	},
});

export const {
	setCheckedTopics,
	addCheckedTopic,
	setCurrentIndex,
	setUncheckedTopics,
	addAllUncheckedTopics,
} = topicSlice.actions;

export default topicSlice.reducer;
