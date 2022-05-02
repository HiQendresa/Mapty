("use strict");

//Application Architecture
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const clearBtn = document.querySelector(".btn_clear");
const sortBtn = document.querySelector(".btn_sort");
const validation = document.querySelector(".num");

//******************************************* */

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}
class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.clacPace();
    this._setDescription();
  }
  clacPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / this.duration;
    return this.speed;
  }
}

// Architecture of program

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #wrokouts = [];
  #markers = [];
  _distances = [];
  _markerGroup;
  _marker;
  sorted = false;
  workout;
  editElement;
  localStorageElement;
  element;
  editFlag = false;
  constructor() {
    //this function will be called immediately
    this._getposition();

    //Get data from local storage
    this._getLocalStorage();

    form.addEventListener("submit", this._newWorkout.bind(this));

    inputType.addEventListener("change", this._toggleElevationField);

    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));

    // sortBtn.addEventListener("click", this._sortWorkouts);
  }

  _getposition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          console.log(`Couldn't get the location`);
        }
      );
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot//{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));

    this.#wrokouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapEv) {
    this.#mapEvent = mapEv;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }
  _toggleElevationField() {
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.toggleAttribute("required", "");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.setAttribute("required", "");
  }

  _deleteWorkout(e) {
    //Select the workout element
    const element = e.target.closest(".workout");
    if (!element) return;
    containerWorkouts.removeChild(element);

    const workout = this.#wrokouts.find(
      (work) => work.id === element.dataset.id
    );
    const [lt, lg] = workout.coords;
    const markerCoords = this.#markers.find((mark) => {
      const { lat, lng } = mark.getLatLng();
      if (lat === lt && lng === lg) return mark;
    });

    if (markerCoords) markerCoords.remove();
    this._deleteMarker(markerCoords);
    // this._DeleteFromLocalStorage(workout);

    //********************** */
    const index = this.#wrokouts.indexOf(workout);
    let data = JSON.parse(localStorage.getItem("workouts"));
    console.log(index);
    if (!data) return;
    console.log(data);
    data.splice(index, 1);
    localStorage.setItem("workouts", JSON.stringify(data));
  }

  _editWorkout(e) {
    //Display the form
    // this._showForm(this.#mapEvent);
    form.style.display = "grid";
    form.classList.remove("hidden");
    this.editFlag = true;

    //Select the workout element
    const workoutHtml = e.target.closest(".workout");
    if (!workoutHtml) return;

    console.log(workoutHtml);
    const workout = this.#wrokouts.find(
      (work) => work.id === workoutHtml.dataset.id
    );

    console.log(workout);
    this.editElement = workout;
    this.element = workoutHtml;

    const [lt, lg] = workout.coords;
    const markerCoords = this.#markers.find((mark) => {
      const { lat, lng } = mark.getLatLng();
      if (lat === lt && lng === lg) return mark;
    });
    workoutHtml.classList.remove(`workout--${workout.type}`);
    markerCoords._popup._container.classList.remove(`${workout.type}-popup`);
    // Set to the form data from  the workout we want to edit
    inputType.value = workout.type;
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    if (workout.type === "running")
      return (inputCadence.value = workout.cadence);
    if (workout.type === "cycling")
      return (inputElevation.value = workout.elevationGain);
  }

  //Delete all the workouts
  _deleteAllWorksout() {
    const li = containerWorkouts.querySelectorAll("li");
    li.forEach((li) => containerWorkouts.removeChild(li));
    this._markerGroup.remove();
    this.#markers = [];
    this.reset();
  }
  _clearBtn() {
    if (this.#wrokouts.length > 1) clearBtn.classList.remove("hidden");
    clearBtn.addEventListener("click", this._deleteAllWorksout.bind(this));
  }

  _newWorkout(e) {
    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    if (!this.editFlag) {
      // Get data from form
      const { lat, lng } = this.#mapEvent.latlng;

      //if workout running, create running object
      if (type === "running") {
        const cadence = +inputCadence.value;
        this.workout = new Running([lat, lng], distance, duration, cadence);
      }

      //if workout cycling, create cycling object
      if (type === "cycling") {
        const elevation = +inputElevation.value;

        this.workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      // Add new object to array
      this.#wrokouts.push(this.workout);
      //Delete all workouts from list

      // Render workout on map as marker
      this._renderWorkoutMarker(this.workout);

      //Render workout Path
      // this._renderWorkoutPath(this.workout);
      //Render workout on list
      this._renderWorkout(this.workout);

      //Hide form + clear input fields
      this._hideForm();

      //Set local storage to all workouts
      this._setLocalStorage();
    }
    //Submit the edited element
    if (this.editFlag) {
      this.editElement.type = type;
      this.editElement.distance = distance;
      this.editElement.duration = duration;
      this.editElement.speed = distance / duration;
      this.editElement.pace = duration / distance;

      //Set the description
      let date = this.editElement.description.split(" ").slice(1, 4).join(" ");
      const description = `${type[0].toUpperCase()}${type.slice(1)} ${date}`;
      this.editElement.description = description;

      //if workout running, create running object
      if (type === "running") {
        const cadence = +inputCadence.value;
        this.editElement.cadence = cadence;
      }
      //if workout cycling, create cycling object
      if (type === "cycling") {
        const elevation = +inputElevation.value;
        this.editElement.elevationGain = elevation;
      }
      // add new class
      this.element.classList.add(`workout--${type}`);

      this._HTMLworkout(this.editElement);

      this.element.outerHTML = this._HTMLworkout(this.editElement);
      const deleteBtn = document.querySelector(".btn_delete");
      const editBtn = document.querySelector(".btn_edit");
      deleteBtn.addEventListener("click", this._deleteWorkout.bind(this));
      editBtn.addEventListener("click", this._editWorkout.bind(this));

      this._hideForm();
      this.editFlag = false;
      const [lt, lg] = this.editElement.coords;
      const markerCoords = this.#markers.find((mark) => {
        const { lat, lng } = mark.getLatLng();
        if (lat === lt && lng === lg) return mark;
      });

      if (markerCoords) {
        markerCoords.setPopupContent(
          `${this.editElement.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${
            this.editElement.description
          }`
        );
        markerCoords._popup._container.classList.add(
          `${this.editElement.type}-popup`
        );
      }

      const el = this.#wrokouts.find((item) => {
        if (item.id === this.editElement.id);
        return item;
      });
      this._setLocalStorage();
      location.reload();
    }
  }
  _renderWorkoutMarker(workout) {
    this._markerGroup = L.layerGroup(this.#markers).addTo(this.#map);
    this._marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`
      )
      .openPopup();
    this.#markers.push(this._marker);
  }

  _renderWorkout(workout) {
    let html = this._HTMLworkout(workout);
    form.insertAdjacentHTML("afterend", html);

    const deleteBtn1 = document.querySelector(".btn_delete");
    const editBtn = document.querySelector(".btn_edit");

    deleteBtn1.addEventListener("click", this._deleteWorkout.bind(this));
    editBtn.addEventListener("click", this._editWorkout.bind(this));
    this._clearBtn();
  }

  _deleteMarker(marker) {
    const index = this.#markers.indexOf(marker);
    if (index > -1) this.#markers.splice(index, 1);
    localStorage.removeItem("marker");
  }
  _updateMarker(marker) {
    marker.update();
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#wrokouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (!data) return;
    this.#wrokouts = data;
    this.#wrokouts.forEach((work) => {
      this._renderWorkout(work);
    });
    // });
  }
  //Update local Storage
  _editLocalStorage(id, value) {
    let data = JSON.parse(localStorage.getItem("workouts"));
    data = data.map(function (item) {
      if (item.id === id) {
        item.value = value;
      }
      return item;
    });
    localStorage.setItem("workouts", JSON.stringify(data));
  }
  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }

  _HTMLworkout(workout) {
    let html = `
     <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title flex space_between">
            <p>${workout.description}</p>
            <div class="flex space_between">
              <button class="btn_edit color-2">Edit  <i class="fas fa-edit"></i>&nbsp;</button> &nbsp;
              <button class="btn_delete color-1">Delete    <i class="fas fa-trash"></i></button>
            </div>
          </h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
            }</span>
            <span class="workout__value distance" >${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
           <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value duration">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === "running")
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value pace">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶</span>
            <span class="workout__value cadence">${workout.cadence.toFixed(
              1
            )}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;

    if (workout.type === "cycling")
      html += `
         <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value speed">${workout.speed.toFixed(
              1
            )}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🚵‍♂️</span>
            <span class="workout__value elevationGain">${
              workout.elevationGain
            }</span>
            <span class="workout__unit">m</span>
          </div>
        </li> `;

    return html;
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;
    let workout = this.#wrokouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    // undefined

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    if (workout.type === "running") {
      workout = new Running(
        workout.coords,
        workout.distance,
        workout.duration,
        workout.cadence
      );
    }

    if (workout.type === "cycling") {
      workout = new Cycling(
        workout.coords,
        workout.distance,
        workout.duration,
        workout.elevationGain
      );
    }
    // using public interface
    workout.click();
    console.log(workout);
  }
}

//create the object

const app = new App();

//***************************************************** */
// function extraLongFactorials(n) {
//   let result = 1;
//   if (n == 0 || n == result) return 1;
//   for (let i = n; i >= 1; i--) return (result *= i);
//   console.log((result));
// }

// extraLongFactorials(25);
