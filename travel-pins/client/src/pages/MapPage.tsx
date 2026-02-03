import { useState } from 'react';
import SlideOver from '../components/SlideOver';

export default function MapPage() {
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  return (
    <div className="map-container">
      {/* Map placeholder */}
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>🗺️ Travel Pins Map</h1>
        <p style={{ color: '#6b7280' }}>Your map will be displayed here</p>
        <button
          onClick={() => setIsSlideOverOpen(true)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          Add Pin
        </button>
      </div>

      {/* Slide over for adding/editing pins */}
      <SlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        title="Add New Pin"
      >
        <form
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Title
            </label>
            <input
              type="text"
              placeholder="Enter pin title"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Description
            </label>
            <textarea
              placeholder="Enter pin description"
              rows={4}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.75rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            Save Pin
          </button>
        </form>
      </SlideOver>
    </div>
  );
}
