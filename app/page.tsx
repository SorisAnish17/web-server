"use client";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";

interface BodyDto {
  type: string;
  content: string;
}

interface ReadByDto {
  _id: string;
  type: string;
  timestamp: string;
}

interface SenderDto {
  _id: string;
  type: string;
}

interface Message {
  _id?: string;
  chatRoomId: string;
  type: string;
  body: BodyDto;
  readBy: ReadByDto[];
  deleted: boolean;
  sender: SenderDto;
}

const ChatRoom = () => {
  const chatRoomId = "670cdd0e7b7cc5f792667c6e"; // Example chat room ID
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const userId = "670cdb861fa97a38f6a74957";
  const customerName = "Luiz";
  const serverUrl = "http://localhost:8000";

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(serverUrl, {
      query: { username: customerName, type: "merchant", userId },
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to the server with ID:", socket.id);
    });

    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${serverUrl}/chat-event/messages`, {
          params: { chatRoomId },
        });
        setMessages(response.data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    const handleNewMessage = (message: Message) => {
      console.log("new messages", message);
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.emit("leaveTicket", chatRoomId);
      socket.disconnect();
    };
  }, [chatRoomId, customerName, userId, serverUrl]);

  const postMessages = async (messageData: Message) => {
    try {
      await axios.post(`${serverUrl}/chat-event/send-message`, messageData);
    } catch (error) {
      console.error("Error posting message", error);
    }
  };

  const sendMessage = async () => {
    if (messageInput && socketRef.current) {
      const message: Message = {
        chatRoomId,
        type: "Message",
        body: { type: "Text", content: messageInput }, // Ensure the body type is 'Text'
        readBy: [],
        deleted: false,
        sender: { _id: userId, type: "merchant" },
      };
      console.log("Sending message:", message);

      // Post the message to the server
      await postMessages(message);

      // Clear the input after sending
      setMessageInput("");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Chat Room: {chatRoomId}</h2>
      <div
        style={{
          height: "300px",
          overflowY: "scroll",
          border: "1px solid #ccc",
          marginBottom: "10px",
          padding: "10px",
        }}
      >
        {messages.map((msg) => (
          <div key={msg._id}>
            <strong>{msg.sender.type}: </strong>
            {msg.body.content}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        style={{ marginRight: "10px" }}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default ChatRoom;
