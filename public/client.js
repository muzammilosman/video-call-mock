let goRoom = document.getElementById('goRoom')
let localVideo = document.getElementById('localVideo')
let remoteVideo = document.getElementById('remoteVideo')
let roomNumber = document.getElementById('roomNumber')

goRoom.addEventListener('click', () => createRoom())

let iceServers = {
    'iceServers': [{
            'urls': 'stun:stun.services.mozilla.com'
        },
        {
            'urls': 'stun:stun.l.google.com:19302'
        }
    ]
}

const streamConstraints = {
    audio: true,
    video: true
}

let localStream
let remoteStream
let rtcPeerConnection
let isCaller = false
let socket = io()
let roomNo

function createRoom() {
    roomNo = roomNumber.value
    if (roomNo.value != '') {
        socket.emit('create or join', roomNo)
    }
}

socket.on('created', (room) => {
    window.navigator.mediaDevices.getUserMedia(streamConstraints).then(
        stream => {
            console.log("User media received")
            localStream = stream
            localVideo.srcObject = stream
            isCaller = true
        }
    ).catch(err => console.log("Error while fetching media device:", err))
})

socket.on('joined', (room) => {
    window.navigator.mediaDevices.getUserMedia(streamConstraints).then(
        stream => {
            localStream = stream
            localVideo.srcObject = stream
            roomNo = room
            socket.emit('ready', room)
        }
    ).catch(err => console.log("Error while fetching media device:", err))
})


socket.on('ready', () => {
    if (isCaller) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.createOffer()
            .then(sessionDescription => {
                rtcPeerConnection.setLocalDescription(sessionDescription);
                socket.emit('offer', {
                    type: 'offer',
                    sdp: sessionDescription,
                    room: roomNo
                });
            })
            .catch(error => {
                console.log(error)
            })
    }
})

socket.on('offer', (event) => {
    if (!isCaller) {
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
        rtcPeerConnection.createAnswer()
            .then(sessionDescription => {
                rtcPeerConnection.setLocalDescription(sessionDescription);
                socket.emit('answer', {
                    type: 'answer',
                    sdp: sessionDescription,
                    room: roomNo
                });
            })
            .catch(error => {
                console.log(error)
            })
    }
})

socket.on('answer', (event) => {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})

socket.on('candidate', (event) => {
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    rtcPeerConnection.addIceCandidate(candidate);
})

function onIceCandidate(event) {
    if (event.candidate) {
        console.log('sending ice candidate');
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNo
        })
    }
}

function onAddStream(event) {
    console.log("Stream received from remote:", event.streams)
    remoteVideo.srcObject = event.streams[0];
    remoteStream = event.stream;
}