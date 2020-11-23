import React from "react";
import { v1 as uuid } from "uuid";
import Button from "@material-ui/core/Button";

const CreateRoom = (props) => {
  function create() {
    const id = uuid();
    props.history.push(`/room/${id}`);
  }

  return (
    <div>
      <img
        src="/dot-grid-triangle.svg"
        alt="dots"
        style={{
          left: 0,
          top: "40px",
          position: "fixed",
          height: "200px",
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
        <h1>Socialize with Friends!</h1>
        <Button variant="contained" color="primary" onClick={create}>
          Create Room
        </Button>
      </div>
    </div>
  );
};

export default CreateRoom;
