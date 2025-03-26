import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("three-animation-container");
    if (!container) return;

    // Set up Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    
    // Position camera
    camera.position.set(0, 0, 9);
    camera.lookAt(3, -1, 2);

    // Set up optimized renderer
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0xf6b31b);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for better performance
    
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Optimized lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
    frontLight.position.set(0, 0, 10);
    scene.add(frontLight);

    // Use a simple GLTFLoader setup with optimized DRACO loader
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);
    
    let mixer;
    
    loader.load(
        "/utils/tree-animation/stop_motion_pixel_art_pine.glb",
        (gltf) => {
            // Define colors for meshes that might need replacement materials
            const colors = [
                0x8844aa, 0x5588ee, 0x44bbdd, 0x66cc77,
                0xaadd66, 0xffee58, 0xffbb33, 0xff8844
            ];
            let colorIndex = 0;
            
            // Apply optimized materials to each mesh
            gltf.scene.traverse((node) => {
                if (node.isMesh) {
                    const originalMaterial = node.material;
                    
                    // Check if original material has working textures
                    let hasWorkingTexture = false;
                    
                    if (originalMaterial.map) {
                        hasWorkingTexture = true;
                        
                        // Optimize texture settings
                        originalMaterial.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                        originalMaterial.map.minFilter = THREE.LinearMipmapLinearFilter;
                        originalMaterial.map.magFilter = THREE.LinearFilter;
                        originalMaterial.needsUpdate = true;
                    }
                    
                    // For transparent materials, ensure they render properly
                    if (originalMaterial.transparent) {
                        originalMaterial.side = THREE.DoubleSide;
                        originalMaterial.alphaTest = 0.1;
                    }
                    
                    // Only replace materials that have no texture
                    if (!hasWorkingTexture) {
                        // Create a colorful material for this mesh
                        const material = new THREE.MeshStandardMaterial({
                            color: colors[colorIndex % colors.length],
                            roughness: 0.7,
                            metalness: 0.3,
                            transparent: originalMaterial.transparent,
                            opacity: originalMaterial.opacity,
                            side: THREE.DoubleSide
                        });
                        
                        // Apply the new material
                        node.material = material;
                        colorIndex++;
                    }
                    
                    // Enable shadows
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            // Add the entire model to the scene
            scene.add(gltf.scene);
            
            // Set up animations if available
            if (gltf.animations && gltf.animations.length) {
                mixer = new THREE.AnimationMixer(gltf.scene);
                const action = mixer.clipAction(gltf.animations[0]);
                action.play();
            }
            
            // Center and scale the model
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = box.getCenter(new THREE.Vector3());
            gltf.scene.position.x -= center.x;
            gltf.scene.position.y -= center.y;
            gltf.scene.position.z -= center.z;
            
            // Set model rotation
            gltf.scene.rotation.y = Math.PI;
            
            // Make the model larger
            const size = box.getSize(new THREE.Vector3()).length();
            const scale = 20 / size;
            gltf.scene.scale.set(scale, scale, scale);
        },
        null,
        (error) => console.error("Error loading model:", error)
    );

    // Optimize resize handler with debounce
    let resizeTimeout;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }, 100);
    });

    // Optimized animation loop
    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        
        if (mixer) {
            mixer.update(clock.getDelta());
        }
        
        renderer.render(scene, camera);
    }
    
    animate();
});