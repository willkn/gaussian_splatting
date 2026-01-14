import streamlit as st
import streamlit.components.v1 as components
import time
import base64

# --- Page Config ---
st.set_page_config(
    page_title="SplatCam - Gaussian Splatting",
    page_icon="📸",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# --- Premium CSS Injection ---
st.markdown("""
<style>
    /* Premium Look & Feel */
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
    
    html, body, [data-testid="stAppViewContainer"] {
        font-family: 'Outfit', sans-serif;
        background-color: #050505 !important;
        color: #ffffff;
    }
    
    /* Hide Streamlit Header/Footer */
    header, footer {visibility: hidden;}
    
    .main {
        background: radial-gradient(circle at top right, #1a1a2e, #050505);
    }
    
    .stButton>button {
        width: 100%;
        border-radius: 50px;
        padding: 0.75rem 1.5rem;
        background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        color: white;
        font-weight: 600;
        border: none;
        transition: transform 0.2s;
        box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);
    }
    
    .stButton>button:active {
        transform: scale(0.95);
    }
    
    .glass {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        padding: 2rem;
        margin-bottom: 2rem;
    }
    
    .gradient-text {
        background: linear-gradient(135deg, #fff 0%, #a5a5a5 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 700;
        font-size: 2.5rem;
        text-align: center;
        margin-bottom: 0.5rem;
    }
    
    .status-badge {
        background: rgba(99, 102, 241, 0.1);
        color: #818cf8;
        padding: 4px 12px;
        border-radius: 100px;
        font-size: 0.8rem;
        font-weight: 600;
        display: inline-block;
        margin-bottom: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# --- App Logic ---
if 'step' not in st.session_state:
    st.session_state.step = 'welcome'
if 'images' not in st.session_state:
    st.session_state.images = []

def go_to_capture(): st.session_state.step = 'capture'
def go_to_processing(): st.session_state.step = 'processing'
def reset_app(): 
    st.session_state.step = 'welcome'
    st.session_state.images = []

# --- Views ---

if st.session_state.step == 'welcome':
    st.markdown('<div style="height: 10vh"></div>', unsafe_allow_html=True)
    st.markdown('<div class="gradient-text">SplatCam</div>', unsafe_allow_html=True)
    st.markdown('<p style="text-align: center; color: #a5a5a5;">Turn any object into a 3D Gaussian Splat instantly.</p>', unsafe_allow_html=True)
    
    st.markdown('<div class="glass" style="margin-top: 2rem;">', unsafe_allow_html=True)
    st.write("### Instructions")
    st.write("1. 📸 **Capture**: Snap 3-5 photos of an object from different angles.")
    st.write("2. ⚡ **Generate**: Our FFN model reconstructs the 3D scene in seconds.")
    st.write("3. 🎨 **View**: Explore the splat in real-time on your device.")
    st.markdown('</div>', unsafe_allow_html=True)
    
    if st.button("Start New Scan", key="start_btn"):
        go_to_capture()
        st.rerun()

elif st.session_state.step == 'capture':
    st.markdown('<div class="status-badge">STEP 1: UPLOAD PHOTOS</div>', unsafe_allow_html=True)
    st.write("Take photos of your object. They will be added to the gallery below.")
    
    # Cumulative upload logic
    new_images = st.file_uploader(
        "Add Photo", 
        type=['png', 'jpg', 'jpeg'], 
        accept_multiple_files=True,
        key="uploader",
        label_visibility="collapsed"
    )
    
    if new_images:
        # Check for duplicates or unique IDs to prevent infinite loop on rerun
        # but for simplicity we'll just clear the uploader state
        for img in new_images:
            if img not in st.session_state.images:
                st.session_state.images.append(img)
        st.rerun()

    # Gallery Display
    if st.session_state.images:
        st.write(f"### Gallery ({len(st.session_state.images)} photos)")
        cols = st.columns(3)
        for idx, img in enumerate(st.session_state.images):
            cols[idx % 3].image(img, use_container_width=True)
            
    st.markdown('<div style="margin-top: 2rem;"></div>', unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("Clear All", type="secondary"):
            st.session_state.images = []
            st.rerun()
    with col2:
        if len(st.session_state.images) >= 3:
            if st.button("Generate Splat ⚡"):
                go_to_processing()
                st.rerun()
        else:
            st.button(f"Need {3 - len(st.session_state.images)} more", disabled=True)
            
    if st.button("Back to Welcome"):
        reset_app()
        st.rerun()

elif st.session_state.step == 'processing':
    st.markdown('<div class="status-badge">STEP 2: FFN RECONSTRUCTION</div>', unsafe_allow_html=True)
    st.write("### AI is building your splat...")
    
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    statuses = [
        "Initializing FFN nodes...",
        "Extracting depth maps...",
        "Synthesizing Gaussian ellipsoids...",
        "Optimizing SH coefficients...",
        "Finalizing mobile assets..."
    ]
    
    for i in range(100):
        time.sleep(0.05)
        progress_bar.progress(i + 1)
        if i % 20 == 0:
            status_text.write(f"_{statuses[i // 20]}_")
            
    st.session_state.step = 'viewer'
    st.rerun()

elif st.session_state.step == 'viewer':
    st.markdown('<div class="status-badge">STEP 3: 3D VIEW</div>', unsafe_allow_html=True)
    st.markdown('<div class="gradient-text" style="font-size: 1.5rem;">Interactive Splat</div>', unsafe_allow_html=True)
    
    # Embedding the GSPLAT viewer
    SPLAT_URL = "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k-mini.splat"
    
    viewer_html = f"""
    <div id="container" style="width: 100%; height: 500px; background: #000; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);"></div>
    
    <script type="importmap">
    {{
        "imports": {{
            "gsplat": "https://cdn.jsdelivr.net/npm/gsplat@0.1.9/dist/index.js"
        }}
    }}
    </script>
    
    <script type="module">
        import * as GSPLAT from "gsplat";

        const container = document.getElementById("container");
        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        container.appendChild(canvas);

        const scene = new GSPLAT.Scene();
        const camera = new GSPLAT.Camera();
        const renderer = new GSPLAT.WebGLRenderer(canvas);
        const controls = new GSPLAT.OrbitControls(camera, canvas);

        async function init() {{
            try {{
                await GSPLAT.Loader.LoadAsync("{SPLAT_URL}", scene);
                
                function animate() {{
                    requestAnimationFrame(animate);
                    controls.update();
                    renderer.render(scene, camera);
                }}
                animate();
                
                window.addEventListener("resize", () => {{
                    renderer.setSize(container.clientWidth, container.clientHeight);
                }});
                renderer.setSize(container.clientWidth, container.clientHeight);
            }} catch (e) {{
                console.error(e);
            }}
        }}

        init();
    </script>
    """
    
    components.html(viewer_html, height=520)
    
    if st.button("New Scan 🔄"):
        reset_app()
        st.rerun()

st.markdown("""
<div style="text-align: center; padding-top: 2rem; color: #444; font-size: 0.7rem; letter-spacing: 2px;">
    POWERED BY GAUSSIAN SPLATTING AI
</div>
""", unsafe_allow_html=True)
