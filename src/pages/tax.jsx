import React, { useState } from 'react';
import './tax.css';

export default function Tax() {
    const [showForm, setShowForm] = useState(false);
    const [taxes, setTaxes] = useState([
        { id: 1, name: 'STATE TAX', percentage: 9 },
        { id: 2, name: 'OCCUPANCY TAX', percentage: 3 }
    ]);

    const [formName, setFormName] = useState('');
    const [formPercentage, setFormPercentage] = useState('');

    const handleSave = (e) => {
        e.preventDefault();
        if (!formName || !formPercentage) return;

        const newTax = {
            id: Date.now(),
            name: formName.toUpperCase(),
            percentage: parseFloat(formPercentage)
        };

        setTaxes([...taxes, newTax]);
        setFormName('');
        setFormPercentage('');
        setShowForm(false);
    };

    return (
        <div className="tax-container">
          

            {!showForm ? (
                /* --- LIST VIEW --- */
                <div className="tax-list-view">
                    <button className="btn-add-tax" onClick={() => setShowForm(true)}>
                        Add New Tax Category
                    </button>

                    <div className="tax-cards-wrapper">
                        {taxes.map((tax) => (
                            <div key={tax.id} className="tax-card">
                                <div className="tax-card-header">
                                    <h3>{tax.name}</h3>
                                    <button className="btn-edit-icon" title="Edit">
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                        </svg>
                                    </button>
                                </div>
                                <div className="tax-card-body">
                                    <div className="tax-info-group">
                                        <span className="info-label">Name</span>
                                        <span className="info-value">{tax.name}</span>
                                    </div>
                                    <div className="tax-info-group">
                                        <span className="info-label">Tax Percentage</span>
                                        <span className="info-value">{tax.percentage}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* --- FORM VIEW --- */
                <div className="tax-form-view">
                    <form onSubmit={handleSave} className="tax-form-card">
                        
                        <div className="form-group">
                            <label className="form-label">Tax category name?</label>
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
                                <span>Name of the tax category. For e.g <strong>Room Booking</strong> or <strong>Hotel Amenity</strong>. This name will also appear when adding items in folios.</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tax percentage?</label>
                            <input 
                                type="number" 
                                placeholder="Tax percentage" 
                                className="form-input"
                                value={formPercentage}
                                onChange={(e) => setFormPercentage(e.target.value)}
                                required
                                step="any"
                            />
                            <div className="form-hint">
                                <span className="hint-icon">⚠️</span>
                                <span>Tax Percentage number for this category without % sign. For e.g <strong>18</strong></span>
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