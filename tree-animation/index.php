<?php
/**
 * Generate the Three.js animation HTML and required scripts
 * 
 * @return string HTML for the animation
 */
function generateThreeAnimation() {
    $html = '<div class="three-animation-wrapper"><div id="three-animation-container" class="three-animation-container"></div></div>';
    
    // Add import map to resolve bare module specifiers
    $html .= '
    <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/"
      }
    }
    </script>';
    
    // Include external script as a module
    $html .= '<script type="module" src="/utils/tree-animation/script.js"></script>';
    
    // Include CSS
    $html .= '<link rel="stylesheet" href="/utils/tree-animation/styles.css">';
    
    return $html;
}
?>