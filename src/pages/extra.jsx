import React, { useState } from 'react';
import './extra.css';

export default function Extra() {
    const [showForm, setShowForm] = useState(false);
    const [extras, setExtras] = useState([
        { id: 1, name: 'EXTRA BED', price: 500 },
        { id: 2, name: 'EARLY CHECK-IN', price: 300 }
    ]);

    const [formName, setFormName] = useState('');
    const [formPrice, setFormPrice] = useState('');

    const handleSave = (e) => {
        e.preventDefault();
        if (!formName || !formPrice) return;

        const newExtra = {
            id: Date.now(),
            name: formName.toUpperCase(),
            price: parseFloat(formPrice)
        };

        setExtras([...extras, newExtra]);
        setFormName('');
        setFormPrice('');
        setShowForm(false);
    };

    return (
        <div className="extra-container">
          

            {!showForm ? (
                /* --- LIST VIEW --- */
                <div className="extra-list-view">
                    <button className="btn-add-extra" onClick={() => setShowForm(true)}>
                        Add New Extra Category
                    </button>

                    <div className="extra-cards-wrapper">
                        {extras.map((extra) => (
                            <div key={extra.id} className="extra-card">
                                <div className="extra-card-header">
                                    <h3>{extra.name}</h3>
                                    <button className="btn-edit-icon" title="Edit">
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                        </svg>
                                    </button>
                                </div>
                                <div className="extra-card-body">
                                    <div className="extra-info-group">
                                        <span className="info-label">Name</span>
                                        <span className="info-value">{extra.name}</span>
                                    </div>
                                    <div className="extra-info-group">
                                        <span className="info-label">Price / Rate</span>
                                        <span className="info-value">{extra.price}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* --- FORM VIEW --- */
                <div className="extra-form-view">
                    <form onSubmit={handleSave} className="extra-form-card">
                        
                        <div className="form-group">
                            <label className="form-label">Extra category name?</label>
                            <input 
                                type="text" 
                                placeholder="Name" 
                                className="form-input"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                required
                            />
                            <div className="form-hint">
                                <span className="hint-icon">⚠️</span>
                                <span>Name of the extra category. For e.g <strong>Extra Bed</strong> or <strong>Late Checkout</strong>. This name will also appear when adding items in folios.</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Price / Rate?</label>
                            <input 
                                type="number" 
                                placeholder="Price amount" 
                                className="form-input"
                                value={formPrice}
                                onChange={(e) => setFormPrice(e.target.value)}
                                required
                                step="any"
                            />
                            <div className="form-hint">
                                <span className="hint-icon">⚠️</span>
                                <span>Specify the default flat rate or price number for this extra category. For e.g <strong>500</strong></span>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-save">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}