import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'

function App() {
    const mountRef = useRef(null)

    useEffect(() => {
        // Scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xdddddd)

        // Camera
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        camera.position.set(0, 0, 1)

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(window.innerWidth, window.innerHeight)
        mountRef.current.appendChild(renderer.domElement)

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.addEventListener('change', () => {
            renderer.render(scene, camera)
        })

        // Light
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5)
        scene.add(ambientLight)

        renderer.render(scene, camera)

        // Load the low resolution PCD
        const loader = new PLYLoader()
        loader.load(`${process.env.PUBLIC_URL}/low.ply`, (geometry) => {
            geometry.computeVertexNormals()
            const material = new THREE.PointsMaterial({
                size: 0.05,
                vertexColors: true,
            })
            const highResPcd = new THREE.Points(geometry, material)
            scene.add(highResPcd)
            renderer.render(scene, camera)
            console.log('Loaded and centered high res PCD')
        })
        fetch(`${process.env.PUBLIC_URL}/high/list.json`)
            .then((res) => res.json())
            .then((files) => {
                const maxConcurrentLoads = 1
                let activeLoads = 0
                let index = 0

                const loadNext = () => {
                    if (index >= files.length) return

                    if (activeLoads < maxConcurrentLoads) {
                        const { filename, position } = files[index++]
                        activeLoads++

                        // Load the high resolution PCD part
                        const worker = new Worker(new URL('./plyWorker.js', import.meta.url), { type: 'module' })
                        worker.postMessage({
                            fileUrl: `${process.env.PUBLIC_URL}/high/${filename}`,
                        })
                        worker.onmessage = (event) => {
                            const lod = new THREE.LOD()

                            // Load an empty point cloud for the low resolution
                            const emptyGeometry = new THREE.BufferGeometry()
                            const emptyMaterial = new THREE.PointsMaterial({
                                size: 0.05,
                                vertexColors: true,
                            })
                            const emptyPcd = new THREE.Points(emptyGeometry, emptyMaterial)
                            lod.addLevel(emptyPcd, 5)

                            const { vertices } = event.data

                            // Create a buffer geometry and set the position attribute
                            let bufferGeometry = new THREE.BufferGeometry()
                            bufferGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))

                            const material = new THREE.PointsMaterial({
                                size: 0.05,
                                vertexColors: true,
                            })
                            const highResPcd = new THREE.Points(bufferGeometry, material)
                            lod.addLevel(highResPcd, 0)

                            // Set position of LOD object
                            lod.position.set(position[0], position[1], position[2])

                            scene.add(lod)
                            renderer.render(scene, camera)

                            activeLoads--
                            loadNext()
                        }
                    }
                }

                // Start loading files
                for (let i = 0; i < maxConcurrentLoads; i++) {
                    loadNext()
                }
            })

        return () => {
            mountRef.current.removeChild(renderer.domElement)
            controls.dispose()
        }
    }, [])

    return (
        <div
            ref={mountRef}
            style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
        />
    )
}

export default App
