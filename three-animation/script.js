import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("three-animation-container");
    if (!container) return;

    // Set up Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    
    // Position camera further back to see larger model
    camera.position.set(0, 0, 9);
    camera.lookAt(3, -1, 2);

    // Set up renderer with simplified settings for compatibility
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0xf6b31b);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Simple renderer settings that work in most browsers
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Simple but effective lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
    frontLight.position.set(0, 0, 10);
    scene.add(frontLight);

    // Use a simple GLTFLoader setup
    const loader = new GLTFLoader();
    
    // Set up a DRACO loader for compressed models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);
    
    let mixer;
    
    // Try loading the model with debugging information
    console.log("Loading model...");
    
    loader.load(
        "/animation/three-animation/stop_motion_pixel_art_pine.glb",
        (gltf) => {
            console.log("Model loaded successfully:", gltf);
            
            // Define colors for meshes that might need replacement materials
            const colors = [
                0x8844aa, 0x5588ee, 0x44bbdd, 0x66cc77,
                0xaadd66, 0xffee58, 0xffbb33, 0xff8844
            ];
            let colorIndex = 0;
            
            // Keep track of which meshes have working textures
            const workingTextureMeshes = [];
            const problematicMeshes = [];
            
            // Apply materials to each mesh - preserve originals where possible
            gltf.scene.traverse((node) => {
                if (node.isMesh) {
                    console.log("Processing mesh:", node.name);
                    
                    // Store original material for reference
                    const originalMaterial = node.material;
                    console.log("Original material:", originalMaterial);
                    
                    // Check if original material has working textures
                    let hasWorkingTexture = false;
                    
                    if (originalMaterial.map) {
                        console.log(`Mesh ${node.name} has a texture map`);
                        hasWorkingTexture = true;
                        
                        // Enhance the texture quality
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
                        problematicMeshes.push(node.name);
                        
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
                    } else {
                        workingTextureMeshes.push(node.name);
                    }
                    
                    // Enable shadows
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            console.log("Meshes with working textures:", workingTextureMeshes);
            console.log("Meshes with replacement materials:", problematicMeshes);
            
            // Add the entire model to the scene
            scene.add(gltf.scene);
            
            // Set up animations if available
            if (gltf.animations && gltf.animations.length) {
                console.log(`Found ${gltf.animations.length} animations`);
                mixer = new THREE.AnimationMixer(gltf.scene);
                const action = mixer.clipAction(gltf.animations[0]);
                action.play();
            }
            
            // Center the model
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = box.getCenter(new THREE.Vector3());
            gltf.scene.position.x -= center.x;
            gltf.scene.position.y -= center.y;
            gltf.scene.position.z -= center.z;
            
            // Set model rotation (adjust as needed)
            gltf.scene.rotation.y = Math.PI;
            
            // Make the model larger
            const size = box.getSize(new THREE.Vector3()).length();
            const scale = 20 / size; // Scale to a larger size
            gltf.scene.scale.set(scale, scale, scale);
            
            console.log("Model processed with size:", size, "and scale:", scale);
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