const canvas = document.getElementById("universe");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const G = 6.67430e-4;
const objects = [];
let running = false;
let anchorMode = false;
let gravityEnabled = true;
let trailsEnabled = false;

let runButton = document.getElementById("runButton");
let anchorPopup = document.getElementById("anchorPopup");
let blackHolePopup = document.getElementById("blackHolePopup");

let blackHoles = [];

const closeMenuButton = document.getElementById("closeMenu");
const introMenu = document.getElementById("introMenu");

closeMenuButton.addEventListener("click", function() {
    introMenu.style.display = "none";
});


blackHolePopup.style.display = "none";

function createBlackHole() {
    blackHolePopup.style.display = "block";
    setTimeout(() => blackHolePopup.style.display = "none", 5000);
    canvas.addEventListener("click", placeBlackHole);
}

function placeBlackHole(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const blackHole = new CelestialObject(mouseX, mouseY, 60, 1e8, "black");
    blackHole.isBlackHole = true;
    blackHole.isAbsorbing = false;
    blackHole.anchored = false;
    blackHole.anchoringMode = false;
    blackHoles.push(blackHole);

    blackHolePopup.style.display = "none";
    canvas.removeEventListener("click", placeBlackHole);
}

function enableAnchorMode() {
    anchorMode = true;
    anchorPopup.style.display = "block";
    setTimeout(() => anchorPopup.style.display = "none", 5000);
}

canvas.addEventListener("click", (e) => {
    if (anchorMode) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        for (let obj of [...objects, ...blackHoles]) {
            const dx = mouseX - obj.x;
            const dy = mouseY - obj.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= obj.radius) {
                if (obj.anchored) {
                    obj.anchored = false;
                    obj.vx = Math.random() * 2 - 1;
                    obj.vy = Math.random() * 2 - 1;
                    obj.update = function () {
                        this.x += this.vx;
                        this.y += this.vy;
                    };
                } else {
                    obj.anchored = true;
                    obj.vx = 0;
                    obj.vy = 0;
                    obj.update = function () {};
                }

                anchorPopup.style.display = "none";
                break;
            }
        }
        anchorMode = false;
    }
});

class CelestialObject {
    constructor(x, y, radius, mass, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.mass = mass;
        this.color = color;
        this.vx = Math.random() * 2 - 1;
        this.vy = Math.random() * 2 - 1;
        this.anchored = false;
        this.trail = [];
        this.isBlackHole = false;
        this.isAbsorbing = false;
        this.animationTime = 0;
        this.explosionTriggered = false;
    }

    draw() {
        if (this.isBlackHole) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = "black";
            ctx.shadowColor = "white";
            ctx.shadowBlur = 40;
            ctx.fill();
            ctx.closePath();

            if (this.isAbsorbing) {
                ctx.fillStyle = "white";
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + this.animationTime, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
                this.animationTime += 0.2;
                if (this.animationTime > 10) this.isAbsorbing = false;
            }
        } else {
            if (trailsEnabled && this.trail.length > 0) {
                ctx.beginPath();
                ctx.moveTo(this.trail[0].x, this.trail[0].y);
                for (let i = 1; i < this.trail.length; i++) {
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                }
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 20;
            ctx.fill();
            ctx.closePath();
        }
    }

    update() {
        if (!this.anchored) {
            for (let obj of objects) {
                if (obj !== this && !obj.isBlackHole) {
                    const dx = obj.x - this.x;
                    const dy = obj.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > this.radius + obj.radius && gravityEnabled) {
                        const force = (G * this.mass * obj.mass) / (distance * distance);
                        const ax = (force * dx) / (distance * this.mass);
                        const ay = (force * dy) / (distance * this.mass);

                        this.vx += ax;
                        this.vy += ay;
                    }

                    if (this.isBlackHole && distance < this.radius * 0.5) {
                        this.isAbsorbing = true;
                        this.radius += 1;
                        objects.splice(objects.indexOf(obj), 1);
                    }
                }
            }

            for (let blackHole of blackHoles) {
                if (blackHole !== this) {
                    const dx = blackHole.x - this.x;
                    const dy = blackHole.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > this.radius + blackHole.radius && gravityEnabled) {
                        const force = (G * this.mass * blackHole.mass) / (distance * distance);
                        const ax = (force * dx) / (distance * this.mass);
                        const ay = (force * dy) / (distance * this.mass);

                        this.vx += ax;
                        this.vy += ay;
                    }

                    if (this.isBlackHole && distance < this.radius + blackHole.radius) {
                        blackHole.isAbsorbing = true;
                        blackHole.radius += 2;
                    }
                }
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        if (trailsEnabled && !this.isBlackHole) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 50) {
                this.trail.shift();
            }
        }
    }
}

function addPlanet() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = Math.random() * 10 + 5;
    const mass = radius * 1e4;
    const color = `hsl(${Math.random() * 360}, 80%, 60%)`;
    objects.push(new CelestialObject(x, y, radius, mass, color));
}

function addStar() {
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    const radius = 30;
    const mass = radius * 1e6;
    const color = "yellow";
    objects.push(new CelestialObject(x, y, radius, mass, color));
}

function toggleSimulation() {
    running = !running;
    runButton.textContent = running ? "Pause" : "Run";
}

function clearObjects() {
    objects.length = 0;
    blackHoles.length = 0;
}

function toggleGravity() {
    gravityEnabled = !gravityEnabled;
    const gravityButton = document.getElementById("gravityButton");
    gravityButton.textContent = gravityEnabled ? "Turn Off Gravity" : "Turn On Gravity";
}

function toggleTrails() {
    trailsEnabled = !trailsEnabled;
    const trailsButton = document.getElementById("trailsButton");
    trailsButton.textContent = trailsEnabled ? "Turn Off Trails" : "Turn On Trails";
}

function saveUniverse() {
    const universeState = {
        objects: objects.map(obj => ({
            x: obj.x,
            y: obj.y,
            radius: obj.radius,
            mass: obj.mass,
            color: obj.color,
            vx: obj.vx,
            vy: obj.vy,
            anchored: obj.anchored,
            trail: obj.trail,
            isBlackHole: obj.isBlackHole,
            isAbsorbing: obj.isAbsorbing,
            animationTime: obj.animationTime
        })),
        blackHoles: blackHoles.map(blackHole => ({
            x: blackHole.x,
            y: blackHole.y,
            radius: blackHole.radius,
            mass: blackHole.mass,
            isBlackHole: blackHole.isBlackHole,
            isAbsorbing: blackHole.isAbsorbing,
            animationTime: blackHole.animationTime
        }))
    };

    const dataStr = JSON.stringify(universeState);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "universe_state.json";
    a.click();
    URL.revokeObjectURL(url);
}

function loadUniverse(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const universeState = JSON.parse(event.target.result);

        objects.length = 0;
        blackHoles.length = 0;

        universeState.objects.forEach(objData => {
            const obj = new CelestialObject(
                objData.x,
                objData.y,
                objData.radius,
                objData.mass,
                objData.color
            );
            obj.vx = objData.vx;
            obj.vy = objData.vy;
            obj.anchored = objData.anchored;
            obj.trail = objData.trail;
            obj.isBlackHole = objData.isBlackHole;
            obj.isAbsorbing = objData.isAbsorbing;
            obj.animationTime = objData.animationTime;
            objects.push(obj);
        });

        universeState.blackHoles.forEach(blackHoleData => {
            const blackHole = new CelestialObject(
                blackHoleData.x,
                blackHoleData.y,
                blackHoleData.radius,
                blackHoleData.mass,
                "black"
            );
            blackHole.isBlackHole = blackHoleData.isBlackHole;
            blackHole.isAbsorbing = blackHoleData.isAbsorbing;
            blackHole.animationTime = blackHoleData.animationTime;
            blackHoles.push(blackHole);
        });

        console.log("Universe loaded successfully.");
    };
    reader.readAsText(file);
}


document.getElementById("loadInput").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file) {
        loadUniverse(file);
    }
});

document.getElementById("saveButton").addEventListener("click", saveUniverse);


function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (running) {
        for (let obj of objects) {
            obj.update();
            obj.draw();
        }

        for (let blackHole of blackHoles) {
            blackHole.update();
            blackHole.draw();
        }
    } else {
        for (let obj of objects) {
            obj.draw();
        }

        for (let blackHole of blackHoles) {
            blackHole.draw();
        }
    }

    for (let i = 0; i < blackHoles.length; i++) {
        for (let j = i + 1; j < blackHoles.length; j++) {
            const dx = blackHoles[i].x - blackHoles[j].x;
            const dy = blackHoles[i].y - blackHoles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < blackHoles[i].radius + blackHoles[j].radius) {
                blackHoles[i].radius += 10;
                blackHoles[j].radius += 10;
                blackHoles[i].explosionTriggered = true;
                blackHoles[j].explosionTriggered = true;


                for (let obj of objects) {
                    const angle = Math.atan2(dy, dx);
                    const force = 50;
                    const relativeX = obj.x - (blackHoles[i].x + blackHoles[j].x) / 2;
                    const relativeY = obj.y - (blackHoles[i].y + blackHoles[j].y) / 2;

                    const angleToBlast = Math.atan2(relativeY, relativeX);
                    obj.vx += Math.cos(angleToBlast) * force;
                    obj.vy += Math.sin(angleToBlast) * force;
                }

                blackHoles.splice(j, 1);
                break;
            }
        }
    }

    requestAnimationFrame(animate);
}

animate();
