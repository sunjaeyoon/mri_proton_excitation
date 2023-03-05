/*
Followed this guy's instructions: https://www.youtube.com/watch?v=8K5wJeVgjrM
*/

// LIBRARIES
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';
import { GUI } from 'dat.gui';
import Plotly from 'plotly.js-dist';

// SHADERS
import vertex from './shaders/vertex.glsl';
import fragment from './shaders/fragment.glsl';


export default class Sketch {
    constructor() {
        // Scene, Camera, Renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, (window.innerWidth / 2) / window.innerHeight, 0.1, 1000);
        this.camera.position.set(-2, 2, -2);
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#bg'),
        });
        this.renderer.setSize(window.innerWidth / 2, window.innerHeight);
        this.time = 0;
 
        // Global Variables 
        // in createArrows()
        this.arrows = [];
        this.arrows_dir = [];
        this.offset = [];
        this.track_mag_x = [];
        this.track_mag_y = [];
        this.track_mag_z = [];
        this.track_mag = [];
        this.track_max = window.innerWidth / 2;

        // UI parameters
        this.VFA = false;
        this.VFA_angle = 90;
        this.TE = 300;
        this.T1 = 1000;
        this.T2 = 100;
        this.wave_dilation = 10;
        // Orbit Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.createGUI();

        // Plotly
        //this.TESTER = document.getElementById('tester');
        this.createGraph();





        // Add Objects
        //this.createMesh();
        this.createGrid();
        this.createArrow();

        // Event Listeners
        window.addEventListener('resize', this.onWindowResize, false);
        this.animate();
    };

    onWindowResize = () => {
        this.camera.aspect = (window.innerWidth / 2) / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth / 2, window.innerHeight);
    };

    render = () => {
        this.time++;
        this.renderer.render(this.scene, this.camera);
    };

    animate = () => {
        //console.log(this.arrows.dir);
        //console.log(this.arrows.position)
        let sum_x = 0;
        let sum_y = 0;
        let sum_z = 0;
        //let relax = this.relax_mat('B', this.time, this.T1, this.T2);
        this.arrows.forEach((element, index) => {
            //this.arrows_dir[index] 
            let angle = this.offset[index];
            //let current_pos = this.arrows_dir[index];
            //let rot_mat = this.rotationMatrix('z', angle);
            //let new_pos = this.multiplyMatrixAndPoint(rot_mat, current_pos);
            let new_pos = new THREE.Vector3();
            //new_pos = this.multiplyMatrixAndPoint(relax, new_pos);
            new_pos.y = (1-Math.exp(-this.time/this.T1));
            new_pos.x = Math.sin(this.time/this.wave_dilation) * Math.exp(-this.time/this.T2);
            new_pos.z = Math.cos(this.time/this.wave_dilation) * Math.exp(-this.time/this.T2);
            //new_pos.x = new_pos.x.toFixed(5);
            //new_pos.y = new_pos.y.toFixed(5);
            //new_pos.z = new_pos.z.toFixed(5);
            //console.log(new_pos)
            this.arrows_dir[index] = new_pos;
            element.setDirection(new_pos);
            element.setLength(new_pos.length());
            //console.log(e)
            sum_x += new_pos.x;
            sum_y += new_pos.y;
            sum_z += new_pos.z;
            //sum_mag += new_pos.z;
        })
        //console.log(Math.abs(sum)/11)
        // Update Tracker
        this.track_mag_x.unshift(sum_x);
        this.track_mag_x.length = Math.min(this.track_mag_x.length, this.track_max);

        this.track_mag_y.unshift(sum_z);
        this.track_mag_y.length = Math.min(this.track_mag_y.length, this.track_max);

        this.track_mag_z.unshift(sum_y);
        this.track_mag_z.length = Math.min(this.track_mag_z.length, this.track_max);
        //this.track_mag.unshift(Math.sqrt(sum_mag ** 2 + sum ** 2));
        //this.track_mag.length = Math.min(this.track_mag.length, this.track_max);

        //console.log(this.track_mag_x)
        /*
        if (this.time == Math.floor(this.TE/2) && this.time > 0) {
            this.refocusPulse();
        } else if (this.time % this.TE == Math.floor(this.TE/2) && this.time > 0) {
            if (this.VFA === false) {
                this.refocusPulse();
            } else {
                this.refocusPulseVFA();
            }
        }*/

        this.render();
        requestAnimationFrame(this.animate);

        this.updateGraph();
    };

    // Manual Rotation Matrices
    rotationMatrix = (axis, angle) => {
        if (axis === 'x') {
            return [1, 0, 0,
                0, Math.cos(angle), -Math.sin(angle),
                0, Math.sin(angle), Math.cos(angle)]
        } else if (axis === 'z') {
            return [Math.cos(angle), 0, Math.sin(angle),
                0, 1, 0,
            -Math.sin(angle), 0, Math.cos(angle)]
        } else if (axis === 'y') {
            return [Math.cos(angle), -Math.sin(angle), 0,
            Math.sin(angle), Math.cos(angle), 0,
                0, 0, 1]
        } else {
            return None
        }
    };

    relax_mat = (axis, t, T1, T2) =>{ 
        if (axis === 'T2') {
            return [Math.exp(-t/T2), 0, 0,
                    0, 1, 0,
                    0, 0, Math.exp(-t/T2)]
        } else if (axis === 'T1') {
            return [1, 0, 0,
                    0, 1-Math.exp(-t/T1), 0,
                    0, 0, 1]
        } else if (axis === 'B'){
            return [Math.exp(-t/T2), 0, 0,
                    0, 1, 0,
                    0, 0, Math.exp(-t/T2)]
        }
    }

    // point • matrix
    multiplyMatrixAndPoint = (matrix, point) => {
        // Give a simple variable name to each part of the matrix, a column and row number
        let c0r0 = matrix[0],
            c1r0 = matrix[1],
            c2r0 = matrix[2];

        let c0r1 = matrix[3],
            c1r1 = matrix[4],
            c2r1 = matrix[5];

        let c0r2 = matrix[6],
            c1r2 = matrix[7],
            c2r2 = matrix[8];

        // Now set some simple names for the point
        let x = point.x;
        let y = point.y;
        let z = point.z;

        // Multiply the point against each part of the 1st column, then add together
        let resultX = x * c0r0 + y * c0r1 + z * c0r2;

        // Multiply the point against each part of the 2nd column, then add together
        let resultY = x * c1r0 + y * c1r1 + z * c1r2;

        // Multiply the point against each part of the 3rd column, then add together
        let resultZ = x * c2r0 + y * c2r1 + z * c2r2;

        return new THREE.Vector3(resultX, resultY, resultZ);
    };

    createGraph = () => {

        var canvas = document.getElementById('DemoCanvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        // ...then set the internal size to match
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    updateGraph = () => {
        function plotData(ctx, xOffset, yOffset, maximum, data, color) {
            // Write
            ctx.font = "30px Arial";
            ctx.fillText("Signal Intensity", 10, 50);

            var width = ctx.canvas.width;
            var height = ctx.canvas.height;
            var scale = 20;

            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = color; //"rgb(66,44,255)";

            // console.log("Drawing point...");
            // drawPoint(ctx, yOffset+step);

            var x = 4;
            var y = 0;
            var amplitude = 40;
            var frequency = 20;
            ctx.moveTo(width / 2, height / 2);
            while (x < maximum) {
                y = height / 2 - data[x] * 100;
                ctx.lineTo(-(x - width - 4) / 2, y);
                x++;
                // console.log("x="+x+" y="+y);
            }
            ctx.stroke();
            ctx.save();

            // console.log("Drawing point at y=" + y);
            // drawPoint(ctx, y);
            ctx.stroke();
            ctx.restore();
        }

        function showAxes(ctx, axes) {
            var width = ctx.canvas.width;
            var height = ctx.canvas.height;
            var xMin = 0;

            ctx.beginPath();
            ctx.strokeStyle = "rgb(128,128,128)";

            // X-Axis
            ctx.moveTo(xMin, height / 2);
            ctx.lineTo(width, height / 2);

            // Y-Axis
            ctx.moveTo(width / 2, 0);
            ctx.lineTo(width / 2, height);

            // Starting line
            ctx.moveTo(0, 0);
            ctx.lineTo(0, height);

            ctx.stroke();
        }

        let canvas = document.getElementById('DemoCanvas');
        if (canvas.getContext) {
            let context = canvas.getContext("2d");

            context.clearRect(0, 0, canvas.width, canvas.height);
            showAxes(context);
            context.save();

            //plotData(context, this.time, 50, this.track_max, this.track_mag_x, "rgb(66,44,255)");
            plotData(context, this.time, 50, this.track_max, this.track_mag_x, "rgb(255,0,0)");
            plotData(context, this.time, 50, this.track_max, this.track_mag_y, "rgb(0,0,255)");
            plotData(context, this.time, 50, this.track_max, this.track_mag_z, "rgb(0,255,0)");
            context.restore();

        }

    }

    createGUI = () => {
        // Reset Animation
        this.gui = new GUI();
        this.gui.domElement.id = 'gui';
        this.resetAnimation =
            () => {
                this.arrows.forEach((element, index) => {
                    const dir = new THREE.Vector3(0, 0, 1);
                    this.arrows_dir[index] = dir;
                    element.setDirection(dir);
                });

                this.time = 0;
            };

        this.gui.add(this, 'resetAnimation').name('Reset Animation');

        // Refocusing
        this.refocusPulse =
            () => {
                this.arrows.forEach((element, index) => {
                    let angle = Math.PI;
                    let current_pos = this.arrows_dir[index];
                    let rot_mat = this.rotationMatrix('x', angle);

                    let new_pos = this.multiplyMatrixAndPoint(rot_mat, current_pos);
                    this.arrows_dir[index] = new_pos;
                    element.setDirection(new_pos);
                });
            };

        this.gui.add(this, 'refocusPulse').name('180 RF Pulse');

        // Refocusing VFA
        this.refocusPulseVFA =
            function () {
                console.log(this.arrows_dir)
                this.arrows.forEach((element, index) => {
                    let angle = this.VFA_angle * Math.PI / 180;
                    let current_pos = this.arrows_dir[index];
                    let rot_mat = this.rotationMatrix('x', angle);

                    let new_pos = this.multiplyMatrixAndPoint(rot_mat, current_pos);
                    this.arrows_dir[index] = new_pos;
                    element.setDirection(new_pos);
                });
            };

        this.gui.add(this, 'refocusPulseVFA').name('refocusPulseVFA');

        // Refocusing VFA
        this.testbutton =
            function () {
                console.log(this.track_mag_x)
                this.updateGraph();
            };

        this.gui.add(this, 'testbutton').name('testbutton');

        this.gui.add(this, 'VFA').name('VFA control').listen()
        this.gui.add(this, 'VFA_angle', 0, 270).name('VFA Angle').listen()
        this.gui.add(this, 'TE', 0, 1000,20).name('Time Echo').listen()
        this.gui.add(this, 'T1', 0, 5000,20).name('T1').listen()
        this.gui.add(this, 'T2', 0, 5000,20).name('T2').listen()
        this.gui.add(this, 'wave_dilation', 0, 5,0.5).name('Oscillation').listen()

    }

    createMesh = () => {
        //Mesh
        let number = 512;
        this.geometry = new THREE.BufferGeometry();
        this.positions = new THREE.BufferAttribute(new Float32Array(number * number * 3), 3);
        this.coordinates = new THREE.BufferAttribute(new Float32Array(number * number * 3), 3);

        let index = 0;
        for (let i = 0; i < number; i++) {
            let posX = i - number / 2;
            for (let j = 0; j < number; j++) {
                this.positions.setXYZ(index, posX, j - number / 2, 0);
                this.coordinates.setXYZ(index, i, j, 0);
                index++;
            }
        }

        this.geometry.setAttribute('position', this.positions);
        this.geometry.setAttribute('aCoordinates', this.coordinates);

        this.material = new THREE.ShaderMaterial({
            vertexShader: vertex,
            fragmentShader: fragment
        })
        this.plane = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.plane);
    }

    createGrid = () => {
        this.gridHelper = new THREE.GridHelper();
        this.scene.add(this.gridHelper);
        this.gridHelper2 = new THREE.GridHelper();
        this.axesHelper = new THREE.AxesHelper(5);
        this.scene.add(this.axesHelper);
    }

    createArrow = () => {
        let total = 1
        for (let index = 0; index < total; index++) {
            const dir = new THREE.Vector3(0, 1, 0);

            //normalize the direction vector (convert to vector of length 1)
            dir.normalize();

            const origin = new THREE.Vector3(0, 0, 0);
            const length = 1;

            var letters = "0123456789ABCDEF";

            // html color code starts with #
            var color = '#';

            // generating 6 times as HTML color code consist
            // of 6 letter or digits
            for (var i = 0; i < 6; i++)
                color += letters[(Math.floor(Math.random() * 16))];

            //console.log(color);
            const hex = color;

            const arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
            this.arrows.push(arrowHelper);
            this.arrows_dir.push(dir);
            this.offset.push(1/100);
            this.scene.add(arrowHelper);
        }

    }



}

var draw = new Sketch();