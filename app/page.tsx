// components/ChatRoom.tsx (Client Component)
"use client";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface Message {
  userId: string;
  text: string;
}

const ChatRoom = () => {
  const chatRoomId = "6707d2e4d6c11435011e0640";
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const userId = "67093ade483325807eed81d9";
  const customerName = "Luiz";
  const serverUrl = "http://localhost:8000";

  // Ref to store the socket instance
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize the socket only once
    socketRef.current = io(serverUrl, {
      query: { username: customerName, type: "merchant", userId },
    });

    const socket = socketRef.current;

    // Listener for socket connection
    socket.on("connect", () => {
      console.log("Connected to the server with ID:", socket.id);
      socket.emit("joinTicket", { chatRoomId });
    });

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { userId: message.userId, body: { type: "text", content: message } },
      ]);
    };

    // Listen for confirmation of joining the room
    const handleJoinedRoom = (data: { chatRoomId: string }) => {
      console.log(`Successfully joined room: ${data.chatRoomId}`);
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("joinedRoom", handleJoinedRoom);

    return () => {
      // Cleanup on unmount
      socket.off("newMessage", handleNewMessage);
      socket.off("joinedRoom", handleJoinedRoom);
      socket.emit("leaveTicket", chatRoomId);
      socket.disconnect();
    };
  }, [chatRoomId, customerName, userId, serverUrl]);

  const sendMessage = () => {
    if (messageInput && socketRef.current) {
      // Emit the message to the chat room
      socketRef.current.emit("sendMessage", {
        chatRoomId,
        message: messageInput,
      });
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
        {messages.map((msg, index) => (
          <div key={index}>
            <strong>{msg.userId}: </strong>
            {msg.text}
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
