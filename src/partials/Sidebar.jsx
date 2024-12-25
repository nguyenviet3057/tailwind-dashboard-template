import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";

import SidebarLinkGroup from "./SidebarLinkGroup";
import { useDispatch, useSelector } from "react-redux";
import { topicCurrentIndexSelector, topicCheckedListSelector, topicUncheckedListSelector } from "../redux/topic/topicSelectors";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { addCheckedTopic, setCheckedTopics, setCurrentIndex, addAllUncheckedTopics, setUncheckedTopics } from "../redux/topic/topicSlice";

function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  variant = 'default',
}) {
  const location = useLocation();
  const { pathname } = location;

  const trigger = useRef(null);
  const sidebar = useRef(null);

  const storedSidebarExpanded = localStorage.getItem("sidebar-expanded");
  const [sidebarExpanded, setSidebarExpanded] = useState(storedSidebarExpanded === null ? false : storedSidebarExpanded === "true");

  const [syncTopics, setSyncTopics] = useState(false);

  const dispatch = useDispatch();
  const topicCheckedList = useSelector(topicCheckedListSelector);
  const topicCheckedListRef = useRef([]);
  const topicCurrentIndex = useSelector(topicCurrentIndexSelector);
  const topicUncheckedList = useSelector(topicUncheckedListSelector);
  const topicUncheckedListRef = useRef([]);

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!sidebar.current || !trigger.current) return;
      if (!sidebarOpen || sidebar.current.contains(target) || trigger.current.contains(target)) return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  useEffect(() => {
    localStorage.setItem("sidebar-expanded", sidebarExpanded);
    if (sidebarExpanded) {
      document.querySelector("body").classList.add("sidebar-expanded");
    } else {
      document.querySelector("body").classList.remove("sidebar-expanded");
    }
  }, [sidebarExpanded]);

  // Fetch topics
  useEffect(() => {
    // DEBUG
    // topicCheckedListRef.current = [{
    //   name: "test",
    //   color: "#ffff00"
    // }]
    // dispatch(setCheckedTopics(topicCheckedListRef.current))
    // dispatch(setUncheckedTopics([]))

    dispatch(setCurrentIndex(undefined));

    const socket = new SockJS(import.meta.env.VITE_WEBSOCKET_URL);  // Tạo kết nối SockJS
    const stompClient = new Client({
      webSocketFactory: () => socket,  // Chỉ định WebSocket factory
      onConnect: (frame) => {
        console.log('Connected: ' + frame);
        // Lấy sessionId từ SockJS
        const sessionId = socket._transport.url.split('/')[5]; // SockJS lưu sessionId ở phần URL
        console.log('Session ID từ SockJS topics:', sessionId);

        stompClient.subscribe('/topic', (message) => {
          console.log("Received topics:", message.body)

          const kafkaTopics = JSON.parse(message.body);
          if (Array.isArray(kafkaTopics.topics)) {
            if (topicCheckedListRef.current.length === 0) { // First retrieve topics
              if (topicCheckedList.length === 0) { // New agent
                console.log("New agent")
                topicCheckedListRef.current = kafkaTopics.topics.map(topic => ({
                  name: topic,
                  color: `#${Math.random().toString(16).substring(2, 8)}`
                })).sort((t1, t2) => t1.name.localeCompare(t2.name));
                dispatch(setCheckedTopics(topicCheckedListRef.current));
              } else { // Compare to saved topics to remove deleted topics
                console.log("First fetch new topics")

                topicCheckedListRef.current = topicCheckedList.filter(topic => kafkaTopics.topics.includes(topic.name)).sort((t1, t2) => t1.name.localeCompare(t2.name));
                dispatch(setCheckedTopics(topicCheckedListRef.current));

                topicUncheckedListRef.current = [
                  ...topicUncheckedList, // saved unchecked topics
                  ...kafkaTopics.topics.filter(topic => ![...topicCheckedList, ...topicUncheckedList].map(topic => topic.name).includes(topic)).map(topic => ({ // new unchecked topics
                    name: topic,
                    color: `#${Math.random().toString(16).substring(2, 8)}`
                  }))
                ].sort((t1, t2) => t1.name.localeCompare(t2.name));
                dispatch(setUncheckedTopics(topicUncheckedListRef.current));
              }

              setSyncTopics(true);
            } else {
              // Remove deleted checked topics
              topicCheckedListRef.current = topicCheckedListRef.current.filter(topic => kafkaTopics.topics.includes(topic.name)).sort((t1, t2) => t1.name.localeCompare(t2.name));
              dispatch(setCheckedTopics(topicCheckedListRef.current));

              // Remove deleted unchecked topics & add new created topics
              topicUncheckedListRef.current = [
                ...topicUncheckedListRef.current.filter(topic => kafkaTopics.topics.includes(topic.name)), // saved unchecked topics
                ...kafkaTopics.topics.filter(topic => ![...topicCheckedListRef.current, ...topicUncheckedListRef.current].map(topic => topic.name).includes(topic)).map(topic => ({ // new unchecked topics
                  name: topic,
                  color: `#${Math.random().toString(16).substring(2, 8)}`
                }))
              ].sort((t1, t2) => t1.name.localeCompare(t2.name));
              dispatch(setUncheckedTopics(topicUncheckedListRef.current));
            }
          }
        });
      },
      onDisconnect: () => {
        console.log('Disconnected');
      },
      onStompError: (frame) => {
        console.log('STOMP Error:', frame);
      },
      reconnectDelay: 5000,  // Tự động kết nối lại sau 5 giây nếu mất kết nối
    });

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    }
  }, []);

  const handleChangeTopic = (topic) => {
    if (topicUncheckedListRef.current.includes(topic)) {
      topicCheckedListRef.current = [...topicCheckedListRef.current, topic].sort((t1, t2) => t1.name.localeCompare(t2.name));
      topicUncheckedListRef.current = topicUncheckedListRef.current.filter(uncheckedTopic => uncheckedTopic !== topic).sort((t1, t2) => t1.name.localeCompare(t2.name));
      // dispatch(addCheckedTopic(topic));
      dispatch(setCheckedTopics(topicCheckedListRef.current));
      dispatch(setUncheckedTopics(topicUncheckedListRef.current));
    }

    dispatch(setCurrentIndex(topicCheckedListRef.current.indexOf(topic)));
  }

  return (
    <div className="min-w-fit">
      {/* Sidebar backdrop (mobile only) */}
      <div
        className={`fixed inset-0 bg-gray-900 bg-opacity-30 z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <div
        id="sidebar"
        ref={sidebar}
        className={`flex lg:!flex flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] overflow-y-scroll lg:overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:!w-64 2xl:!w-64 shrink-0 bg-white dark:bg-gray-800 p-4 transition-all duration-200 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-64"} ${variant === 'v2' ? 'border-r border-gray-200 dark:border-gray-700/60' : 'rounded-r-2xl shadow-sm'}`}
      >
        {/* Sidebar header */}
        <div className="flex justify-between mb-10 pr-3 sm:px-2">
          {/* Close button */}
          <button
            ref={trigger}
            className="lg:hidden text-gray-500 hover:text-gray-400"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" />
            </svg>
          </button>
          {/* Logo */}
          <NavLink end to="/" className="block">
            <svg className="fill-violet-500" xmlns="http://www.w3.org/2000/svg" width={32} height={32}>
              <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
            </svg>
          </NavLink>
        </div>

        {/* Links */}
        <div className="space-y-8">
          {/* Pages group */}
          <div>
            <h3 className="text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold pl-3">
              <span className="hidden lg:block lg:sidebar-expanded:hidden 2xl:hidden text-center w-6" aria-hidden="true">
                •••
              </span>
              <span className="lg:hidden lg:sidebar-expanded:block 2xl:block">Topics {!syncTopics ? '(đang đồng bộ)' : ''}</span>
            </h3>
            <ul className="mt-3">
              {/* New topics */}
              {topicUncheckedList.map((topic, index) =>
                <a key={index} className="cursor-pointer block text-gray-800 dark:text-gray-100 truncate transition duration-150 hover:text-gray-900 dark:hover:text-white">
                  <li onClick={() => handleChangeTopic(topic)} className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 bg-[linear-gradient(135deg,var(--tw-gradient-stops))] ${pathname.includes("messages") && "from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]"}`}>
                    <div className="flex items-center justify-between">
                      <div className="grow flex items-center">
                        <div className='w-[16px] h-[16px]' style={{ backgroundColor: topic.color }}></div>
                        <span className="text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200">
                          {topic.name}
                        </span>
                      </div>
                      {/* Badge */}
                      <div className="flex flex-shrink-0 ml-2">
                        <span className="inline-flex items-center justify-center h-5 text-xs font-medium text-white bg-violet-400 px-2 rounded">New</span>
                      </div>
                    </div>
                  </li>
                </a>
              )}

              {/* Topics */}
              {topicCheckedList.map((topic, index) =>
                <a key={index} className="cursor-pointer block text-gray-800 dark:text-gray-100 truncate transition duration-150 hover:text-gray-900 dark:hover:text-white">
                  <li onClick={() => handleChangeTopic(topic)} className={`pl-4 pr-3 py-2 rounded-lg mb-0.5 last:mb-0 bg-[linear-gradient(135deg,var(--tw-gradient-stops))] ${pathname.includes("messages") && "from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]"}`}>
                    <div className="flex items-center justify-between">
                      <div className="grow flex items-center">
                        <div className='w-[16px] h-[16px]' style={{ backgroundColor: topic.color }}></div>
                        <span className={`${topicCurrentIndex !== undefined && topicCheckedList[topicCurrentIndex] && topicCheckedList[topicCurrentIndex].name === topic.name ? 'text-violet-500' : ''} text-sm font-medium ml-4 lg:opacity-0 lg:sidebar-expanded:opacity-100 2xl:opacity-100 duration-200`}>
                          {topic.name}
                        </span>
                      </div>
                    </div>
                  </li>
                </a>
              )}
            </ul>
          </div>
        </div>

        {/* Expand / collapse button */}
        <div className="pt-3 hidden lg:inline-flex 2xl:hidden justify-end mt-auto">
          <div className="w-12 pl-4 pr-3 py-2">
            <button className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400" onClick={() => setSidebarExpanded(!sidebarExpanded)}>
              <span className="sr-only">Expand / collapse sidebar</span>
              <svg className="shrink-0 fill-current text-gray-400 dark:text-gray-500 sidebar-expanded:rotate-180" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                <path d="M15 16a1 1 0 0 1-1-1V1a1 1 0 1 1 2 0v14a1 1 0 0 1-1 1ZM8.586 7H1a1 1 0 1 0 0 2h7.586l-2.793 2.793a1 1 0 1 0 1.414 1.414l4.5-4.5A.997.997 0 0 0 12 8.01M11.924 7.617a.997.997 0 0 0-.217-.324l-4.5-4.5a1 1 0 0 0-1.414 1.414L8.586 7M12 7.99a.996.996 0 0 0-.076-.373Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
