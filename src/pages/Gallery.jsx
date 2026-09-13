import { PageHeader } from "../components/UI";
import { galleryImages } from "../data/mockData";
import { IconPlus } from "../components/Icons";
import "./Gallery.css";

export default function Gallery() {
  return (
    <div>
     

      <div className="gallery-grid">
        {galleryImages.map((img) => (
          <div key={img.id} className="gallery-item">
            <img src={img.url} alt={img.caption} />
            <div className="cap">
              <span>{img.caption}</span>
              <span style={{ color: "var(--danger)", fontWeight: 600, cursor: "pointer" }}>Remove</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
