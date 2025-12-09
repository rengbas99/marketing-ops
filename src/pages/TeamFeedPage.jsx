import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import Card from '../components/primitives/Card.jsx';
import { MessageSquare, Heart, User, Send, Activity } from 'lucide-react';
import { COLLECTIONS, ASSET_STATUS } from '../constants';

export default function TeamFeedPage() {
  const { data, loading, startPolling, stopPolling, addRow, updateRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [commentText, setCommentText] = useState({});

  useEffect(() => {
    startPolling('team-feed', [
      COLLECTIONS.ASSETS,
      COLLECTIONS.ASSET_COMMENTS,
      COLLECTIONS.USERS
    ]);
    return () => stopPolling('team-feed');
  }, [startPolling, stopPolling]);

  // Get assets for feed (exclude "To Edit")
  const feedAssets = data.Assets?.filter(
    a => a.status && a.status !== ASSET_STATUS.TO_EDIT
  ).sort((a, b) => {
    const dateA = new Date(a.updated_at || a.created_at);
    const dateB = new Date(b.updated_at || b.created_at);
    return dateB - dateA;
  }) || [];

  const handleAddComment = async (assetId) => {
    const text = commentText[assetId];
    if (!text?.trim()) return;

    try {
      await addRow(COLLECTIONS.ASSET_COMMENTS, {
        asset_id: assetId,
        user_email: user.email,
        user_name: user.name,
        comment_text: text,
        timestamp: new Date().toISOString(),
      });

      // Update comments count
      const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
      const assetIndex = allAssets.findIndex(a => a && a.asset_id === assetId);
      if (assetIndex !== -1) {
        const currentCount = parseInt(allAssets[assetIndex].comments_count || 0);
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...allAssets[assetIndex],
          comments_count: currentCount + 1,
        });
      }

      await forceRefresh([COLLECTIONS.ASSETS, COLLECTIONS.ASSET_COMMENTS]);

      setCommentText({ ...commentText, [assetId]: '' });
      success('Comment added!');
    } catch (err) {
      error('Error adding comment: ' + err.message);
    }
  };

  const handleGiveKudos = async (assetId) => {
    try {
      const allAssets = Array.isArray(data.Assets) ? data.Assets : [];
      const assetIndex = allAssets.findIndex(a => a && a.asset_id === assetId);
      if (assetIndex !== -1) {
        const currentCount = parseInt(allAssets[assetIndex].kudos_count || 0);
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...allAssets[assetIndex],
          kudos_count: currentCount + 1,
        });

        await forceRefresh([COLLECTIONS.ASSETS]);

        success('Kudos given!');
      }
    } catch (err) {
      error('Error: ' + err.message);
    }
  };

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn mobile-padding pb-8 space-y-8">
      {/* Header */}
      <Card glass className="p-6 rounded-2xl border-l-4 border-primary">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Activity className="w-8 h-8 text-primary" />
          Team Feed
        </h1>
        <p className="text-gray-600">See what the team is working on</p>
      </Card>

      <div className="space-y-6 max-w-3xl mx-auto">
        {feedAssets.length > 0 ? (
          feedAssets.map((asset, index) => {
            const editor = data.Users?.find(u => u.email === asset.assigned_editor_email);
            const comments = data.Asset_Comments?.filter(c => c.asset_id === asset.asset_id) || [];

            return (
              <Card
                glass
                key={asset.asset_id || index}
                className="p-6 animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
                    {editor?.name?.charAt(0) || <User className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-lg">
                      {editor?.name || 'Team Member'}
                    </p>
                    <p className="text-sm text-gray-500 font-medium">
                      {new Date(asset.updated_at || asset.created_at).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${asset.status === ASSET_STATUS.COMPLETED ? 'bg-green-100 text-green-700' :
                      asset.status === ASSET_STATUS.REVIEW ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                    }`}>
                    {asset.status}
                  </span>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {asset.title || 'Untitled Asset'}
                  </h3>
                  {asset.description && (
                    <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {asset.description}
                    </p>
                  )}
                </div>

                {/* Engagement */}
                <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-100">
                  <button
                    onClick={() => handleGiveKudos(asset.asset_id)}
                    className="flex items-center gap-2 text-gray-500 hover:text-pink-500 transition-colors group"
                  >
                    <div className="p-2 rounded-full bg-gray-50 group-hover:bg-pink-50 transition-colors">
                      <Heart className="w-5 h-5 group-hover:fill-current" />
                    </div>
                    <span className="font-bold text-sm">
                      {asset.kudos_count || 0} Kudos
                    </span>
                  </button>
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="p-2 rounded-full bg-gray-50">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm">
                      {comments.length} Comments
                    </span>
                  </div>
                </div>

                {/* Comments */}
                {comments.length > 0 && (
                  <div className="space-y-4 mb-6 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                    {comments.slice(0, 3).map((comment, commentIndex) => {
                      const commentUser = data.Users?.find(u => u.email === comment.user_email);
                      return (
                        <div key={comment.comment_id || commentIndex} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-600 shadow-sm">
                            {commentUser?.name?.charAt(0) || <User className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0 bg-white p-3 rounded-r-xl rounded-bl-xl shadow-sm border border-gray-100">
                            <p className="font-bold text-xs text-gray-900 mb-1">
                              {commentUser?.name || comment.user_name || 'User'}
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {comment.comment_text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {comments.length > 3 && (
                      <button className="text-xs font-bold text-primary hover:underline w-full text-center pt-2">
                        View all {comments.length} comments
                      </button>
                    )}
                  </div>
                )}

                {/* Add Comment */}
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-600">
                    {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={commentText[asset.asset_id] || ''}
                      onChange={(e) => setCommentText({ ...commentText, [asset.asset_id]: e.target.value })}
                      placeholder="Add a comment..."
                      className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow] text-sm font-medium"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddComment(asset.asset_id);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAddComment(asset.asset_id)}
                      disabled={!commentText[asset.asset_id]?.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-16 text-gray-400 bg-white/50 rounded-2xl border border-dashed border-gray-200">
            <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No content in feed yet</p>
            <p className="text-sm mt-2">Activity will appear here as the team works.</p>
          </div>
        )}
      </div>
    </div>
  );
}
