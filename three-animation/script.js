import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// Import additional needed modules
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("three-animation-container");
    if (!container) return;

    // Set up Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    
    // Position camera directly in front of the model
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    // Set up high-quality renderer with explicit texture support
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        precision: "highp" // Use high precision for better quality
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0xf6b31b);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit to 2x for performance
    
    // Fix for Three.js version compatibility with texture encoding
    renderer.outputEncoding = THREE.sRGBEncoding; // Better color encoding
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;
    renderer.physicallyCorrectLights = true; // More accurate lighting
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Improved tone mapping
    renderer.toneMappingExposure = 1.0;
    
    // Enable shadows
    renderer.shadowMap.enabled = true; // Enable shadow mapping
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    container.appendChild(renderer.domElement);

    // Create strong lighting to make textures visible
    // Ambient light (overall illumination)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    // Main directional light (like sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Front light to illuminate model from camera view
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
    frontLight.position.set(0, 0, 10);
    scene.add(frontLight);
    
    // Add hemisphere light for more natural lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Enhanced model loading with DRACO compression support
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    
    // Optional: Add KTX2 texture support if needed
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/libs/basis/');
    
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.setKTX2Loader(ktx2Loader);
    
    // Create texture loader for manual texture loading if needed
    const textureLoader = new THREE.TextureLoader();
    // Set cross-origin policy to allow texture loading from different sources
    textureLoader.crossOrigin = 'anonymous';
    
    let mixer;
    
    // Debug information for texture loading
    console.log("Loading model with textures...");
    
    loader.load(
        "/animation/three-animation/stop_motion_pixel_art_pine.glb",
        (gltf) => {
            console.log("GLTF loaded:", gltf);
            
            // Debug info for texture detection
            const texturesFound = [];
            
            // Process all materials and textures for quality
            gltf.scene.traverse((node) => {
                if (node.isMesh) {
                    console.log("Found mesh:", node.name);
                    node.castShadow = true;
                    node.receiveShadow = true;
                    
                    if (node.material) {
                        console.log("Material found:", node.material);
                        
                        // Apply to single material or array of materials
                        const materials = Array.isArray(node.material) ? node.material : [node.material];
                        
                        materials.forEach(material => {
                            // Log all material properties to debug
                            console.log("Material properties:", Object.keys(material));
                            
                            // Check for and enhance specific texture types
                            const textureTypes = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];
                            
                            textureTypes.forEach(texType => {
                                if (material[texType]) {
                                    console.log(`Found ${texType}:`, material[texType].source);
                                    texturesFound.push(texType);
                                    
                                    // Enhance texture quality
                                    material[texType].anisotropy = renderer.capabilities.getMaxAnisotropy();
                                    material[texType].encoding = texType === 'map' ? THREE.sRGBEncoding : THREE.LinearEncoding;
                                    material[texType].needsUpdate = true;
                                }
                            });
                            
                            // Ensure material is properly updated
                            material.needsUpdate = true;
                        });
                    }
                }
            });
            
            console.log("Textures found in model:", texturesFound);
            
            // Add model to scene
            scene.add(gltf.scene);
            
            // Setup animation if available
            if (gltf.animations && gltf.animations.length) {
                console.log(`Found ${gltf.animations.length} animations`);
                mixer = new THREE.AnimationMixer(gltf.scene);
                const action = mixer.clipAction(gltf.animations[0]);
                action.play();
            }
            
            // Center model
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = box.getCenter(new THREE.Vector3());
            gltf.scene.position.x -= center.x;
            gltf.scene.position.y -= center.y;
            gltf.scene.position.z -= center.z;
            
            // Set model rotation
            gltf.scene.rotation.y = Math.PI;
            
            // Scale the model if needed to make it more visible
            const size = box.getSize(new THREE.Vector3()).length();
            const scale = 5 / size; // Scale to a standard size
            gltf.scene.scale.set(scale, scale, scale);
            
            console.log("Model loaded and processed with size:", size);
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => console.error("Error loading model:", error)
    );

    // Handle window resize
    window.addEventListener("resize", () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Animation loop
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