import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader'

onmessage = async function (e) {
    const { fileUrl } = e.data

    // Fetch the PLY file as a Blob
    const response = await fetch(fileUrl)
    const blob = await response.blob()

    // Read the Blob as an ArrayBuffer using FileReader
    const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsArrayBuffer(blob)
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
    })

    // Parse the ArrayBuffer using PLYLoader
    const loader = new PLYLoader()
    const bufferGeometry = loader.parse(arrayBuffer)

    // Extract and transfer the buffers back to the main thread
    const vertices = bufferGeometry.getAttribute('position').array.buffer

    postMessage({ vertices }, [vertices])
}
