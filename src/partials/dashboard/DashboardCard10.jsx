import React, { useEffect } from 'react';

import Image01 from '../../images/user-36-05.jpg';
import Image02 from '../../images/user-36-06.jpg';
import Image03 from '../../images/user-36-07.jpg';
import Image04 from '../../images/user-36-08.jpg';
import Image05 from '../../images/user-36-09.jpg';
import { useDispatch, useSelector } from 'react-redux';
import { topicCurrentIndexSelector, topicCheckedListSelector } from '../../redux/topic/topicSelectors';

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { messageListSelector } from '../../redux/message/messageSelectors';
import { addMessage, setMessages } from '../../redux/message/messageSlice';

function DashboardCard10() {
  const dispatch = useDispatch();

  const topicCheckedList = useSelector(topicCheckedListSelector);
  const topicCurrentIndex = useSelector(topicCurrentIndexSelector);

  const messageList = useSelector(messageListSelector);

  const customers = [
    {
      id: '0',
      image: Image01,
      name: 'Alex Shatov',
      email: 'alexshatov@gmail.com',
      location: '🇺🇸',
      spent: '$2,890.66',
    },
    {
      id: '1',
      image: Image02,
      name: 'Philip Harbach',
      email: 'philip.h@gmail.com',
      location: '🇩🇪',
      spent: '$2,767.04',
    },
    {
      id: '2',
      image: Image03,
      name: 'Mirko Fisuk',
      email: 'mirkofisuk@gmail.com',
      location: '🇫🇷',
      spent: '$2,996.00',
    },
    {
      id: '3',
      image: Image04,
      name: 'Olga Semklo',
      email: 'olga.s@cool.design',
      location: '🇮🇹',
      spent: '$1,220.66',
    },
    {
      id: '4',
      image: Image05,
      name: 'Burak Long',
      email: 'longburak@gmail.com',
      location: '🇬🇧',
      spent: '$1,890.66',
    },
  ];

  // Tracking messages
  useEffect(() => {
    dispatch(setMessages([]));
    let stompClient;
    if (topicCurrentIndex !== undefined && topicCheckedList[topicCurrentIndex]) {
      const socket = new SockJS(import.meta.env.VITE_WEBSOCKET_URL);
      stompClient = new Client({
        webSocketFactory: () => socket,
        onConnect: (frame) => {
          // Lấy sessionId từ SockJS
          const sessionId = socket._transport.url.split('/')[5]; // SockJS lưu sessionId ở phần URL
          console.log('Session ID từ SockJS messages:', sessionId);

          // stompClient.publish({ destination: `/app/topic/${topicCheckedList[topicCurrentIndex].name}` });
          console.log('Subscribed topic: ' + topicCheckedList[topicCurrentIndex].name);
          stompClient.subscribe(`/app/topic/${sessionId}/${topicCheckedList[topicCurrentIndex].name}`, (message) => {
            // console.log("Received message:", message.body)

            // const oldMessages = JSON.parse(message.body);
            // console.log(oldMessages)
          });

          stompClient.subscribe(`/topic/${sessionId}/${topicCheckedList[topicCurrentIndex].name}`, (message) => {
            // console.log("Received message:", message.body)

            const newMessage = JSON.parse(message.body);
            // console.log(newMessage)

            dispatch(addMessage(newMessage))
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
    }

    return () => {
      if (stompClient) {
        if (topicCurrentIndex && topicCheckedList[topicCurrentIndex] && stompClient.connected) {
          console.log("Unsubscribe topic:", topicCheckedList[topicCurrentIndex].name)
          // stompClient.publish({ destination: `/app/unsubscribe/${topicCheckedList[topicCurrentIndex].name}` });
        }
        stompClient.deactivate();
      }
    }
  }, [topicCurrentIndex]);

  return (
    <>
      {topicCurrentIndex !== undefined && topicCheckedList[topicCurrentIndex] &&
        <div className="col-span-full bg-white dark:bg-gray-800 shadow-sm rounded-xl">
          <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">{topicCheckedList[topicCurrentIndex].name}</h2>
          </header>
          <div className="p-3">

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="table-auto w-full">
                {/* Table header */}
                <thead className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 dark:bg-opacity-50">
                  <tr>
                    <th className="p-2 whitespace-nowrap">
                      <div className="font-semibold text-left">Key</div>
                    </th>
                    <th className="p-2 whitespace-nowrap">
                      <div className="font-semibold text-left">Value</div>
                    </th>
                    <th className="p-2 whitespace-nowrap">
                      <div className="font-semibold text-left">Offset</div>
                    </th>
                  </tr>
                </thead>
                {/* Table body */}
                <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
                  {
                    messageList.map((message, index) => {
                      return (
                        <tr key={index}>
                          <td className="p-2 whitespace-nowrap">
                            <div className="flex items-center">
                              {message.key === null && <div className="font-medium bg-gray-800 text-gray-100 dark:bg-gray-100 dark:text-black px-2 rounded-md">NULL</div>}
                              {message.key !== null && <div className="font-medium text-gray-800 dark:text-gray-100">{message.key}</div>}
                            </div>
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            <div className="text-left">{message.value}</div>
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            <div className="text-left font-medium bg-green-500 text-white dark:text-black w-fit px-2 rounded-md">{message.offset}</div>
                          </td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>

            </div>

          </div>
        </div>
      }
    </>
  );
}

export default DashboardCard10;
