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
                files.forEach(({ filename, position }) => {
                    const lod = new THREE.LOD()

                    // Load an empty point cloud for the low resolution
                    const emptyGeometry = new THREE.BufferGeometry()
                    const emptyMaterial = new THREE.PointsMaterial({
                        size: 0.05,
                        vertexColors: true,
                    })
                    const emptyPcd = new THREE.Points(emptyGeometry, emptyMaterial)
                    lod.addLevel(emptyPcd, 5)

                    // Load the high resolution PCD part
                    loader.load(`${process.env.PUBLIC_URL}/high/${filename}`, (geometry) => {
                        geometry.computeVertexNormals()
                        const material = new THREE.PointsMaterial({
                            size: 0.05,
                            vertexColors: true,
                        })
                        const highResPcd = new THREE.Points(geometry, material)
                        lod.addLevel(highResPcd, 0)
                        renderer.render(scene, camera)
                    })

                    // Set position of LOD object
                    lod.position.set(position[0], position[1], position[2])

                    scene.add(lod)
                })
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
