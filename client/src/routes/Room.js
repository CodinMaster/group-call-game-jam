import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import Iframe from "react-iframe";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import AppBar from "@material-ui/core/AppBar";
import Grid from "@material-ui/core/Grid";
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
  height: inherit;
`;

const Video = (props) => {
  const ref = useRef();

  useEffect(() => {
    props.peer.on("stream", (stream) => {
      ref.current.srcObject = stream;
    });
  }, []);

  return (
    <StyledVideo
      style={{ minHeight: "180px" }}
      playsInline
      autoPlay
      ref={ref}
    />
  );
};

const videoConstraints = {
  // height: window.innerHeight / 2,
  // width: window.innerWidth / 2,
  height: "250px",
  width: "262.5px",
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
      {usernameTrue ? (
        <>
          <AppBar
            position="static"
            color="default"
            style={{
              height: "175px",
            }}
          >
            <Grid
              container
              direction="row"
              justify="space-between"
              alignItems="center"
            >
              <Grid
                item
                xs={3}
                style={{
                  maxWidth: "50%",
                  margin: "auto",
                  paddingBottom: "20px",
                }}
              >
                <StyledVideo muted ref={userVideo} autoPlay playsInline />
              </Grid>
              {peers.map((peer, index) => {
                return (
                  <Grid
                    item
                    xs={3}
                    style={{
                      maxWidth: "50%",
                      margin: "auto",
                      paddingBottom: "20px",
                    }}
                  >
                    <Video key={index} peer={peer} />
                  </Grid>
                );
              })}
            </Grid>
          </AppBar>
          <Grid
            container
            direction="coloumn"
            justify="space-between"
            alignItems="center"
          >
            <Grid
              item
              xs={10}
              style={{
                maxWidth: "70%",
                paddingRight: "10px",
                marginTop: "-200px",
              }}
            >
              <Iframe
                url="https://splix.io/"
                height="500px"
                width="100%"
                display="initial"
                position="relative"
              />
            </Grid>
            <Grid
              item
              xs={2}
              style={{
                maxWidth: "50%",
                paddingBottom: "20px",
              }}
            >
              <ChatBox
                yourID={yourID}
                messages={messages}
                message={message}
                setMessage={setMessage}
                sendMessage={sendMessage}
              />
            </Grid>
          </Grid>
        </>
      ) : (
        <>
          <img
            src="/dot-grid-triangle.svg"
            alt="dots"
            style={{
              left: 0,
              top: "40px",
              position: "fixed",
              height: "250px",
              zIndex: 99,
            }}
          />
          <div
            style={{
              marginTop: "250px",
              marginLeft: "550px",
              minHeight: "36px",
            }}
          >
            <TextField
              type="text"
              label="Display Name"
              placeholder="Enter Display Name"
              variant="outlined"
              style={{
                minWidth: "240px",
              }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setUsernameTrue(true);
                }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              style={{
                minHeight: "55px",
                marginLeft: "20px",
              }}
              onClick={() => setUsernameTrue(true)}
            >
              Submit
            </Button>
          </div>
        </>
      )}
    </Container>
  );
};

export default Room;
