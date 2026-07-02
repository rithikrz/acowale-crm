import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface FormDetails {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isActive: boolean;
  categories: string[];
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export const PublicForm: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // Form config state
  const [form, setForm] = useState<FormDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // User input states
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');

  // Submission states
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ category?: string; comment?: string; email?: string }>({});

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        setFetchError(false);
        const response = await fetch(`${API_BASE}/public/forms/${slug}`);
        if (!response.ok) {
          throw new Error('Form not found');
        }
        const data = await response.json();
        if (data.success && data.data) {
          setForm(data.data);
          // Set initial category value if categories exist
          if (data.data.categories && data.data.categories.length > 0) {
            setCategory(data.data.categories[0]);
          }
        } else {
          setFetchError(true);
        }
      } catch {
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [slug]);

  const validateForm = () => {
    const errors: { category?: string; comment?: string; email?: string } = {};
    if (!category) {
      errors.category = 'Please select a category';
    }
    if (!comment.trim()) {
      errors.comment = 'Comment is required';
    } else if (comment.trim().length < 5) {
      errors.comment = 'Comment must be at least 5 characters long';
    } else if (comment.trim().length > 1000) {
      errors.comment = 'Comment cannot exceed 1000 characters';
    }

    if (email && !/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

    if (!form) return;
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/public/forms/${slug}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          comment,
          email: email.trim() || undefined,
          rating: rating || undefined,
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to submit feedback');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while submitting feedback.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading form details...</p>
      </div>
    );
  }

  // Handle Form Not Found or Inactive Status
  if (fetchError || !form || !form.isActive) {
    return (
      <div className="public-form-container">
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '4.5rem', marginBottom: '20px' }}>🔒</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.8rem', marginBottom: '12px' }}>
            Form Inactive
          </h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            This form is no longer accepting responses or does not exist. Please contact the business owner for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Handle Success State
  if (submitted) {
    return (
      <div className="public-form-container">
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '4.5rem', marginBottom: '20px' }}>✨</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.8rem', marginBottom: '12px' }}>
            Thank You!
          </h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
            Your feedback has been successfully submitted to <strong>{form.title}</strong>. We appreciate you taking the time to share your response.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setSubmitted(false);
              setComment('');
              setEmail('');
              setRating(null);
              if (form.categories.length > 0) {
                setCategory(form.categories[0]);
              }
            }}
          >
            Submit Another Feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-container">
      <div className="card">
        {/* Form header */}
        <div className="public-form-header">
          <h1>{form.title}</h1>
          {form.description ? (
            <p>{form.description}</p>
          ) : (
            <p>Please share your feedback by filling out the form details below.</p>
          )}
        </div>

        {submitError && <div className="alert alert-danger">{submitError}</div>}

        <form onSubmit={handleSubmit}>
          {/* Category Dropdown */}
          <div className="form-group">
            <label className="form-label" htmlFor="category">Feedback Category</label>
            <select
              className="form-select"
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={submitting}
            >
              {form.categories.map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {fieldErrors.category && <span className="error-msg">{fieldErrors.category}</span>}
          </div>

          {/* Star Rating */}
          <div className="form-group">
            <label className="form-label">How would you rate your experience? (Optional)</label>
            <div className="rating-selector">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`rating-star-btn ${rating && rating >= star ? 'selected' : ''}`}
                  onClick={() => setRating(star === rating ? null : star)}
                  disabled={submitting}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Comment Textarea */}
          <div className="form-group">
            <label className="form-label" htmlFor="comment">Your Comments</label>
            <textarea
              className="form-textarea"
              id="comment"
              placeholder="Please describe your experience or report the issue in detail..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
              maxLength={1000}
            />
            <div className="char-counter">
              {comment.length} / 1000 characters
            </div>
            {fieldErrors.comment && <span className="error-msg">{fieldErrors.comment}</span>}
          </div>

          {/* Optional Email */}
          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" htmlFor="email">Your Email Address (Optional)</label>
            <input
              className="form-input"
              type="email"
              id="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
            {fieldErrors.email && <span className="error-msg">{fieldErrors.email}</span>}
          </div>

          {/* Submit button */}
          <button className="btn btn-primary" type="submit" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Submitting response...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PublicForm;
