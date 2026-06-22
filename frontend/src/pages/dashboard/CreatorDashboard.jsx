import { useEffect, useState } from 'react';
import { useCreatorStore } from '../../stores/creatorStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { ChartBarIcon, BanknotesIcon, ListBulletIcon } from '@heroicons/react/24/outline';

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const {
    creatorProfile,
    earnings,
    statistics,
    loading,
    fetchCreatorProfile
  } = useCreatorStore();

  useEffect(() => {
    if (!user?.isCreator) {
      navigate('/dashboard');
      return;
    }
    fetchCreatorProfile();
  }, [user?.isCreator, navigate, fetchCreatorProfile]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading creator profile...</p>
      </div>
    );
  }

  if (!creatorProfile) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Creator profile not found</p>
      </div>
    );
  }

  const totalEarnings = earnings.pending + earnings.approved + earnings.paid;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1>Creator Dashboard</h1>
        <p style={{ color: '#666' }}>Manage your templates and earnings</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #eee', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.75rem 1.5rem',
            borderBottom: activeTab === 'overview' ? '2px solid #1976d2' : 'none',
            color: activeTab === 'overview' ? '#1976d2' : '#666',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'overview' ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ListBulletIcon style={{ width: '20px', height: '20px' }} />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          style={{
            padding: '0.75rem 1.5rem',
            borderBottom: activeTab === 'earnings' ? '2px solid #1976d2' : 'none',
            color: activeTab === 'earnings' ? '#1976d2' : '#666',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'earnings' ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ChartBarIcon style={{ width: '20px', height: '20px' }} />
          Earnings
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          style={{
            padding: '0.75rem 1.5rem',
            borderBottom: activeTab === 'payouts' ? '2px solid #1976d2' : 'none',
            color: activeTab === 'payouts' ? '#1976d2' : '#666',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'payouts' ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <BanknotesIcon style={{ width: '20px', height: '20px' }} />
          Payouts (Coming Soon)
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
      <>

      {/* Creator Profile Card */}
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid #eee'
        }}
      >
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          {creatorProfile.profileImage && (
            <img
              src={creatorProfile.profileImage}
              alt={creatorProfile.displayName}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          )}

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0 }}>{creatorProfile.displayName}</h2>
              {creatorProfile.verificationStatus === 'VERIFIED' && (
                <span
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}
                >
                  Verified
                </span>
              )}
            </div>
            {creatorProfile.bio && (
              <p style={{ margin: '0.5rem 0', color: '#666' }}>
                {creatorProfile.bio}
              </p>
            )}
            {creatorProfile.website && (
              <a
                href={creatorProfile.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#1976d2', textDecoration: 'none', fontSize: '0.9rem' }}
              >
                {creatorProfile.website}
              </a>
            )}
          </div>

          <button
            onClick={() => navigate('/creator-settings')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Earnings Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Total Earnings */}
        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #eee'
          }}
        >
          <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Total Earnings
          </div>
          <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', color: '#1976d2' }}>
            ${totalEarnings.toFixed(2)}
          </h3>
        </div>

        {/* Pending */}
        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #eee'
          }}
        >
          <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Pending (Awaiting Activation)
          </div>
          <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', color: '#ff9800' }}>
            ${earnings.pending.toFixed(2)}
          </h3>
        </div>

        {/* Approved */}
        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #eee'
          }}
        >
          <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Available (Ready to Withdraw)
          </div>
          <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', color: '#4CAF50' }}>
            ${earnings.approved.toFixed(2)}
          </h3>
        </div>

        {/* Paid */}
        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #eee'
          }}
        >
          <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Already Paid
          </div>
          <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', color: '#1976d2' }}>
            ${earnings.paid.toFixed(2)}
          </h3>
        </div>
      </div>

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #eee'
          }}
        >
          <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Published Templates
          </div>
          <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem' }}>
            {statistics.templateCount}
          </h3>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #eee'
          }}
        >
          <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Total Uses
          </div>
          <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem' }}>
            {statistics.totalUsages}
          </h3>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            border: '1px solid #eee'
          }}
        >
          <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Total Payouts
          </div>
          <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem' }}>
            {statistics.totalPayouts}
          </h3>
        </div>
      </div>

      {/* Coming Soon Messages */}
      <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '1.5rem' }}>
        <h3>Next Steps</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#666' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Publish Templates:</strong> Share templates to marketplace
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Track Earnings:</strong> Monitor usage and commissions (view in Earnings tab)
          </li>
          <li>
            <strong>Request Payouts:</strong> Withdraw earnings via bank transfer (Phase 4)
          </li>
        </ul>
      </div>
      </>
      )}

      {/* Earnings Tab */}
      {activeTab === 'earnings' && (
        <div style={{ background: 'white', borderRadius: '8px', padding: '2rem', border: '1px solid #eee' }}>
          <p style={{ fontSize: '1rem', color: '#666', marginBottom: '1.5rem' }}>
            Click the button below to view detailed earnings breakdown with charts and transaction history.
          </p>
          <Link to="/creator-earnings" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '1rem'
            }}>
              View Detailed Earnings
            </button>
          </Link>
        </div>
      )}

      {/* Payouts Tab - Coming Soon */}
      {activeTab === 'payouts' && (
        <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '500', color: '#333', marginBottom: '0.5rem' }}>
            Payouts Coming Soon
          </h3>
          <p style={{ color: '#666' }}>
            In Phase 4, you'll be able to request and manage payouts of your earnings.
          </p>
        </div>
      )}
    </div>
  );
}
