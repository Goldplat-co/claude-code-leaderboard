'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';

export default function MyPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      setError('비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    setMessage('비밀번호가 변경되었습니다.');
    setNewPassword('');
    setConfirmPassword('');
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-2">내 계정</h1>
      <p className="text-gray-500 text-sm mb-8">{email}</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-lg font-semibold mb-6">비밀번호 변경</h2>

        <form onSubmit={handleChangePassword}>
          <div className="mb-5">
            <label htmlFor="new-pw" className="block text-sm font-medium text-gray-700 mb-1.5">
              새 비밀번호
            </label>
            <input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8자 이상"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A020]/40 focus:border-[#D4A020]"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="confirm-pw" className="block text-sm font-medium text-gray-700 mb-1.5">
              비밀번호 확인
            </label>
            <input
              id="confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="한 번 더 입력"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A020]/40 focus:border-[#D4A020]"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#D4A020] text-white font-semibold text-sm hover:bg-[#C4963C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  );
}
