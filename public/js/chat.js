const socket = io();

//Elements
const $messageForm = document.querySelector('form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $locationButton = document.getElementById('send-location');
const $messages = document.getElementById('messages');

//Templates
const $messageTemplate = document.getElementById('message-template').innerHTML;
const $locationMessageTemplate = document.getElementById('locationMessage-template').innerHTML;
const $sidebarTemplate = document.getElementById('sidebar-template').innerHTML;

//Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild;

    // Height of new message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    // Visible Height
    const visibleHeight = $messages.offsetHeight;

    // Height of messages container
    const containerHeight = $messages.scrollHeight;

    // How far we have scrolled 
    const scrollOffset = $messages.scrollTop + visibleHeight;                               //scrollTop stores how far we have scrolled down from the top
    
    //scrolling will be done if this is true
    if(containerHeight - newMessageHeight <= scrollOffset + 5) {                                 //containerHeight is the height of message container after adding new message, so subtracting that will tell if were at bottom before or not
        $messages.scrollTop = $messages.scrollHeight;
    }
    console.log(newMessageStyles);
};
// server(emit) -> client(receive) --acknowledgement--> server
// client(emit) -> server(receive) --acknowledgement--> server

// socket.on('countUpdated', (count) => {                                           //this event here runs when the emit is done on server side
//     console.log('Count after updation = ', count);
// });

socket.on('message', (message) => {
    console.log(message);
    const html = Mustache.render($messageTemplate, { 
        username: message.username,
        message: message.text, 
        createdAt: moment(message.createdAt).format('h:mm a'),
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('locationMessage', (message) => {
    console.log(message);
    const html = Mustache.render($locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm a'),
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render($sidebarTemplate, {
        room,
        users
    });
    document.getElementById('sidebar').innerHTML = html;
});
// document.getElementById('count-btn').addEventListener('click', () => {
//     socket.emit('incrementAll');                                                //this emit will make the function written on the server side run thereby updating all the clients
//     console.log('clicked');
// });

$messageForm.addEventListener('submit', (event) => {
    event.preventDefault();

    $messageFormButton.setAttribute('disabled', 'disabled');                    //by making the property disabled set as disabled we disable the button

    const message = event.target.elements.message.value;                        //access value for input with name as 'message'
    socket.emit('sendMessage', message, (error) => {                            //the last argument is the acknowledge event, it runs when the event is done
        $messageFormButton.removeAttribute('disabled');
        $messageFormInput.value = '';
        $messageFormInput.focus();
        if(error) {
            return console.log(error);
        }
        console.log('Message Delivered!');
    });
});

$locationButton.addEventListener('click', () => {
    if(!navigator.geolocation) {                                                //checks if the browser have support for sharing location
        return alert('Geolocation is not supported by your browser');
    }
    $locationButton.setAttribute('disabled', 'disabled');
    navigator.geolocation.getCurrentPosition((position) => {
        //console.log(position);
        socket.emit('sendLocation',{ 
            latitude: position.coords.latitude, 
            longitude: position.coords.longitude 
        }, () => {                                                              //event akcnowledgement (a callback function is used)
            $locationButton.removeAttribute('disabled');
            console.log('Location shared!');
        });
    });
});

socket.emit('join', { username, room }, (error) => {
    if(error) {
        alert(error);
        location.href = '/';
    }
});
