import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import ChatBox from "../components/ChatBox";

const Container = styled.div`
  padding: 20px;
  display: flex;
  height: 100vh;
  width: 90%;
  margin: auto;
  flex-wrap: wrap;
`;

const StyledVideo = styled.video`
  height: 40%;
  width: 50%;
`;

const Video = (props) => {
  const ref = useRef();

  useEffect(() => {
    props.peer.on("stream", (stream) => {
      ref.current.srcObject = stream;
    });
  }, []);

  return <StyledVideo playsInline autoPlay ref={ref} />;
};

const videoConstraints = {
  height: window.innerHeight / 2,
  width: window.innerWidth / 2,
};

const Room = (props) => {
  const [username, setUsername] = useState("");
  const [usernameTrue, setUsernameTrue] = useState(false);
  const [peers, setPeers] = useState([]);
  const [yourID, setYourID] = useState();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const socketRef = useRef();
  const userVideo = useRef();
  const peersRef = useRef([]);
  const roomID = props.match.params.roomID;

  useEffect(() => {
    if (usernameTrue) {
      socketRef.current = io.connect("/");
      //--- Text Chat ----
      socketRef.current.on("your id", (id) => {
        setYourID(id);
      });
      socketRef.current.on("message", (message) => {
        console.log("here");
        setMessages((oldMsgs) => [...oldMsgs, message]);
      });
      //--- Video Chat ---
      navigator.mediaDevices
        .getUserMedia({ video: videoConstraints, audio: true })
        .then((stream) => {
          userVideo.current.srcObject = stream;
          socketRef.current.emit("join room", { roomID, username });
          socketRef.current.on("all users", (users) => {
            const peers = [];
            users.forEach((userID) => {
              const peer = createPeer(userID, socketRef.current.id, stream);
              peersRef.current.push({
                peerID: userID,
                peer,
              });
              peers.push(peer);
            });
            setPeers(peers);
          });

          socketRef.current.on("user joined", (payload) => {
            const peer = addPeer(payload.signal, payload.callerID, stream);
            peersRef.current.push({
              peerID: payload.callerID,
              peer,
            });

            setPeers((users) => [...users, peer]);
          });

          socketRef.current.on("receiving returned signal", (payload) => {
            const item = peersRef.current.find((p) => p.peerID === payload.id);
            item.peer.signal(payload.signal);
          });
        });
    }
  }, [usernameTrue]);

  function sendMessage(e) {
    e.preventDefault();
    const messageObject = {
      body: message,
      id: yourID,
      username,
    };
    setMessage("");
    socketRef.current.emit("send message", messageObject);
  }

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current.emit("sending signal", {
        userToSignal,
        callerID,
        signal,
      });
    });

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current.emit("returning signal", { signal, callerID });
    });

    peer.signal(incomingSignal);

    return peer;
  }

  return (
    <Container>
      <div>Apoorv's Chat App</div>
      {usernameTrue ? (
        <>
          <StyledVideo muted ref={userVideo} autoPlay playsInline />
          {peers.map((peer, index) => {
            return <Video key={index} peer={peer} />;
          })}
          <ChatBox
            yourID={yourID}
            messages={messages}
            message={message}
            setMessage={setMessage}
            sendMessage={sendMessage}
          />
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="Enter Display Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button type="submit" onClick={() => setUsernameTrue(true)}>
            Submit
          </button>
        </>
      )}
    </Container>
  );
};

export default Room;
