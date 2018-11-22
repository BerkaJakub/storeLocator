var geocoder;
var map;
var store_markers;
var infowindow;
var apiKey = "7RbRhJ9l9L1vdvR76ukfR0yjvV2913TS";

var fetchedStores;
var filteredStores;
var directionsDisplay;
var directionsService;
var distanceService;
var position;
var bounds;
var autocomplete;
var userMarker;


function initMap() {
    fetch('https://api.mlab.com/api/1/databases/stores-locator/collections/stores?apiKey=7RbRhJ9l9L1vdvR76ukfR0yjvV2913TS')
        .then(function (response) {
            return response.json();
        })
        .then(function (myJson) {

            var myCenter = { lat: 50.0915, lng: 14.44311 };
            var mapStyles = [
                { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                {
                    featureType: 'administrative.locality',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#d59563' }]
                },
                {
                    featureType: 'poi',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#d59563' }]
                },
                {
                    featureType: 'poi.park',
                    elementType: 'geometry',
                    stylers: [{ color: '#263c3f' }]
                },
                {
                    featureType: 'poi.park',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#6b9a76' }]
                },
                {
                    featureType: 'road',
                    elementType: 'geometry',
                    stylers: [{ color: '#38414e' }]
                },
                {
                    featureType: 'road',
                    elementType: 'geometry.stroke',
                    stylers: [{ color: '#212a37' }]
                },
                {
                    featureType: 'road',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#9ca5b3' }]
                },
                {
                    featureType: 'road.highway',
                    elementType: 'geometry',
                    stylers: [{ color: '#746855' }]
                },
                {
                    featureType: 'road.highway',
                    elementType: 'geometry.stroke',
                    stylers: [{ color: '#1f2835' }]
                },
                {
                    featureType: 'road.highway',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#f3d19c' }]
                },
                {
                    featureType: 'transit',
                    elementType: 'geometry',
                    stylers: [{ color: '#2f3948' }]
                },
                {
                    featureType: 'transit.station',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#d59563' }]
                },
                {
                    featureType: 'water',
                    elementType: 'geometry',
                    stylers: [{ color: '#17263c' }]
                },
                {
                    featureType: 'water',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#515c6d' }]
                },
                {
                    featureType: 'water',
                    elementType: 'labels.text.stroke',
                    stylers: [{ color: '#17263c' }]
                }
            ];
            // Init services
            geocoder = new google.maps.Geocoder();
            infowindow = new google.maps.InfoWindow();
            bounds = new google.maps.LatLngBounds();
            distanceService = new google.maps.DistanceMatrixService();
            directionsService = new google.maps.DirectionsService();
            directionsDisplay = new google.maps.DirectionsRenderer();
            var input = document.getElementById('searchField');
            var autocomopleteOptions = {
                bounds: bounds
            };
            autocomplete = new google.maps.places.Autocomplete(input, autocomopleteOptions);

            // Listener for adress input
            google.maps.event.addListener(autocomplete, 'place_changed', function () {
                var place = autocomplete.getPlace();
                var position = geocodeUserAddress(place.formatted_address);



            });

            store_markers = [];
            // Create a map object and specify the DOM element
            map = new google.maps.Map(document.getElementById('map'), {
                center: myCenter,
                zoom: 14
            });
            map.setOptions({ styles: mapStyles });
            directionsDisplay.setMap(map);
            directionsDisplay.setPanel(document.getElementById('directions-panel'));

            // Click listener - user address after click
            position = myCenter;
            google.maps.event.addListener(map, 'click', function (event) {
                geocoder.geocode({
                    'latLng': event.latLng
                }, function (results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        if (results[0]) {
                            position = event.latLng; // save user position
                            setPositionMarker(position);
                            document.querySelector("#user_position").innerHTML = "<strong>You are at: </strong>" + results[0].formatted_address;

                        }
                    }
                });
            });
            fetchedStores = myJson;
            return myJson;

        }).then((data) => {
            showOnMap(data);
        });



}

//Show stores on map
async function showOnMap(data) {
    await (data.map((store, index) => {
        if (store.lat == "" || store.lng == "") { // If the address has no lat and lng geocode it
            geocodeStores(store, index); // geocode address and cache it in DB
        } else { // Else we have cached location in our DB
            var location = new google.maps.LatLng(Number(store.lat), Number(store.lng));
            placeMarkerCallback(location, store.address, store.name); // Place the marker
        }
    }));
    map.fitBounds(bounds);
}


function showDirections(origin, destination) {
    var request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.DirectionsTravelMode.DRIVING
    }
    directionsService.route(request, function (response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            directionsDisplay.setDirections(response);
        }
    });
    hideMarkers();
    //SHOW cancel Direction Button
    var directions = document.querySelector("#directions-panel");
    var cancelButton = document.createElement("button");
    cancelButton.innerText = "Cancel Directions";
    cancelButton.setAttribute("onclick", "cancelDirections()");
    directions.appendChild(cancelButton);
}

// Hiding the directions from map and site
function cancelDirections() {
    directionsDisplay.set('directions', null);
    showOnMap(filteredStores);
    var directions = document.querySelector("#directions-panel");
    directions.innerHTML = "";
}

// Setup the marker of user position, with blue marker
function setPositionMarker(position) {
    if (userMarker == undefined) {
        userMarker = new google.maps.Marker(
            {
                map: map,
                position: position,
                icon: {
                    url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                }
            });
    }

    userMarker.setPosition(position);
    infowindow.setContent("<strong>You are here</strong>");
    infowindow.open(map, userMarker);
    calculateDistances(position);
}

// Geocoding user address
function geocodeUserAddress(address) {
    geocoder.geocode({ 'address': address }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            setPositionMarker(results[0].geometry.location);
            document.querySelector("#user_position").innerHTML = "<strong>You are at: </strong>" + address;
        } else {
            console.log('Geocode was not successful for the following reason: ' + status);
        }
    });

}

function geocodeStores(store, index) {
    geocoder.geocode({ 'address': store.address }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            var lng = results[0].geometry.location.lng();
            var lat = results[0].geometry.location.lat();
            store.lat = lat;
            store.lng = lng;
            fetchedStores[index].lat = lat;
            fetchedStores[index].lng = lng;
            placeMarkerCallback(results[0].geometry.location, store.address, store.name);
            fetch('https://api.mlab.com/api/1/databases/stores-locator/collections/stores?apiKey=' + apiKey, {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(store)
            }).then(res => res.json()).then(res => console.log(res));

        } else {
            console.log('Geocode was not successful for the following reason: ' + status);
        }

    });
}

// Distance matrix call
function calculateDistances(position) {
    var destinations = [];
    fetchedStores.forEach((store) => {
        destinations.push(store.address);
    });
    distanceService.getDistanceMatrix({
        origins: [position],
        destinations: destinations,
        travelMode: 'DRIVING'
    }, distanceCallback);
}

function distanceCallback(response, status) {
    if (status == 'OK') {
        var origins = response.originAddresses;
        var destinations = response.destinationAddresses;
        for (var i = 0; i < origins.length; i++) {
            var results = response.rows[i].elements;
            for (var j = 0; j < results.length; j++) {
                var element = results[j];
                var distance = element.distance.text;
                var duration = element.duration.text;
                fetchedStores[j].distance = distance;
                fetchedStores[j].duration = duration;
            }
        }
        showTopDistances();
        filterMarkers();
    }

}

// Hide markers on the map
function hideMarkers() {
    store_markers.forEach(marker => {
        marker.setMap(null);
    });
}

// Filter the markers according to top 5 stores
function filterMarkers() {
    hideMarkers();
    // Display filtered Markers
    filteredStores.forEach(store => {
        placeMarkerCallback({ "lat": store.lat, "lng": store.lng }, store.address, store.name);
    });

}

// Show top 5 distances in the table
function showTopDistances() {
    fetchedStores.sort((a, b) => (a.distance > b.distance) ? 1 : ((b.distance > a.distance) ? -1 : 0));
    var div = document.querySelector("#topDistances");
    div.innerHTML = "";
    var p = document.createElement("p");
    p.innerHTML = "<strong>Top 5 nearest stores:</strong>";
    div.appendChild(p);
    var table = document.createElement("table");
    var header = document.createElement("tr");
    header.innerHTML = `<th>Shop Name</th>
    <th>Address</th> 
    <th>Distance</th>
    <th>Duration</th>
    `;
    table.appendChild(header);
    filteredStores = [];
    for (var i = 0; i <= 4; i++) {
        var row = document.createElement("tr");
        row.innerHTML = `<td>${fetchedStores[i].name}</td>
        <td>${fetchedStores[i].address}</td> 
        <td>${fetchedStores[i].distance}</td>
        <td>${fetchedStores[i].duration}</td>`
        
        table.appendChild(row);
        filteredStores.push(fetchedStores[i]);
    }
    div.appendChild(table);
}

// Show all stores on map, hide the directions
function showAllStores() {
    cancelDirections();
    showOnMap(fetchedStores);
}

// Place marker on location, add event listeners for mouseover, mouseout and click.
function placeMarkerCallback(location, address, name) {
    var marker = new google.maps.Marker(
        {
            map: map,
            position: location
        });
    store_markers.push(marker);
    bounds.extend(location);


    google.maps.event.addListener(marker, 'mouseover', function () {
        infowindow.setContent("<strong>" + name + "</strong><br>" + address + "<br> Click on marker to get directions");
        infowindow.open(map, marker);
    });

    google.maps.event.addListener(marker, 'mouseout', function () {
        infowindow.close();
    });

    google.maps.event.addListener(marker, 'click', function () { // get directions on click
        showDirections(position, location);
    });
}


/*var data = {
    "stores": [
        {
            "id": "1",
            "name": "Obchod1",
            "address": "Sokolovska 131/86, 186 00 Praha 8-Karlin",
            "lat": "",
            "lng": ""
        },
        {
            "id": "2",
            "name": "Obchod2",
            "address": "Sokolovska 327/29, 186 00 Praha 8-Florenc",
            "lat": "",
            "lng": ""
        },
        {
            "id": "3",
            "name": "Obchod3",
            "address": "Thamova 221/7, 186 00 Praha 8-Karlin",
            "lat": "",
            "lng": ""
        },
        {
            "id": "4",
            "name": "Obchod4",
            "address": "Na Porici 1067/25",
            "lat": "",
            "lng": ""
        },
        {
            "id": "5",
            "name": "Obchod5",
            "address": "Na Porici 28",
            "lat": "",
            "lng": ""
        },
        {
            "id": "6",
            "name": "Obchod6",
            "address": "Saldova 431/22, 186 00 Praha 8-Karlin",
            "lat": "",
            "lng": ""
        },
        {
            "id": "7",
            "name": "Obchod7",
            "address": "Hermanova 596/59, 170 00 Praha 7",
            "lat": "",
            "lng": ""
        },
        {
            "id": "8",
            "name": "Obchod8",
            "address": "Na Porici 1072/15, 110 00 Petrska ctvrt",
            "lat": "",
            "lng": ""
        },
        {
            "id": "9",
            "name": "Obchod9",
            "address": "Italska 23, 120 00 Praha 2",
            "lat": "",
            "lng": ""
        },
        {
            "id": "10",
            "name": "Obchod10",
            "address": "Stepanska 630/53, 110 00 Nove Mesto",
            "lat": "",
            "lng": ""
        },
        {
            "id": "11",
            "name": "Obchod11",
            "address": "Masna 21 Stare Mesto Praha 1, Stare Mesto, 110 00 Praha 1",
            "lat": "",
            "lng": ""
        },
        {
            "id": "12",
            "name": "Obchod12",
            "address": "Vodickova 701/34, 110 00 Nove Mesto",
            "lat": "",
            "lng": ""
        },
        {
            "id": "13",
            "name": "Obchod13",
            "address": "Stepanska 630/53, 110 00 Nove Mesto",
            "lat": "",
            "lng": ""
        },
        {
            "id": "14",
            "name": "Obchod14",
            "address": "Seifertova 996/31, 130 00 Praha 3-zizkov",
            "lat": "",
            "lng": ""
        },
        {
            "id": "15",
            "name": "Obchod15",
            "address": "Sokolovska 394/17, 186 00 Karlin",
            "lat": "",
            "lng": ""
        },
        {
            "id": "16",
            "name": "Obchod16",
            "address": "Na Florenci 2116/15, 110 00 Nove Mesto",
            "lat": "",
            "lng": ""
        },
        {
            "id": "17",
            "name": "Obchod17",
            "address": "Namesti Republiky 656/8, 11000, 110 00, Stare Mesto, 110 00 Praha 1",
            "lat": "",
            "lng": ""
        },
        {
            "id": "18",
            "name": "Obchod18",
            "address": "Namesti Republiky 1078/1, 110 00 Petrska ctvrt",
            "lat": "",
            "lng": ""
        },
        {
            "id": "19",
            "name": "Obchod19",
            "address": "Vaclavske nam. 812/59, 110 00 Nove Mesto",
            "lat": "",
            "lng": ""
        },
        {
            "id": "20",
            "name": "Obchod20",
            "address": "Krizikova 213/44, 186 00 Karlin",
            "lat": "",
            "lng": ""
        }
    ]
};
*/