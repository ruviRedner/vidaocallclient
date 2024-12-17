import React, { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import Peer, { SignalData } from "simple-peer";

const App: React.FC = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const socket = useRef<Socket | null>(null);
    const peerRef = useRef<Peer.Instance | null>(null);

    const userVideo = useRef<HTMLVideoElement>(null);
    const partnerVideo = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // התחברות לשרת
        socket.current = io("https://vidaocall.onrender.com");

        // קבלת וידאו/אודיו מהמשתמש
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            setStream(stream);
            if (userVideo.current) userVideo.current.srcObject = stream;

            // הצטרפות לחדר
            socket.current?.emit("join-room", "room1");

            // כשמשתמש נוסף מתחבר
            socket.current?.on("user-connected", () => {
                callPeer(stream);
            });

            // קבלת signal מהשרת
            socket.current?.on("signal", (data: SignalData) => {
                if (!peerRef.current) {
                    answerPeer(stream, data);
                } else {
                    peerRef.current.signal(data);
                }
            });
        });

        return () => {
            socket.current?.disconnect();
            peerRef.current?.destroy();
        };
    }, []);

    // יוזם חיבור עם Peer
    const callPeer = (stream: MediaStream) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peerRef.current = peer;

        peer.on("signal", (data) => {
            socket.current?.emit("signal", data);
        });

        peer.on("stream", (remoteStream) => {
            if (partnerVideo.current) partnerVideo.current.srcObject = remoteStream;
        });

        peer.on("error", (err) => console.error("Peer error:", err));
    };

    // עונה להצעה מ-Peer אחר
    const answerPeer = (stream: MediaStream, incomingSignal: SignalData) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peerRef.current = peer;

        peer.signal(incomingSignal);

        peer.on("signal", (data) => {
            socket.current?.emit("signal", data);
        });

        peer.on("stream", (remoteStream) => {
            if (partnerVideo.current) partnerVideo.current.srcObject = remoteStream;
        });

        peer.on("error", (err) => console.error("Peer error:", err));
    };

    return (
        <div>
            <h2>My Video</h2>
            <video ref={userVideo} autoPlay muted style={{ width: "300px" }} />
            <h2>Partner Video</h2>
            <video ref={partnerVideo} autoPlay style={{ width: "300px" }} />
        </div>
    );
};

export default App;
