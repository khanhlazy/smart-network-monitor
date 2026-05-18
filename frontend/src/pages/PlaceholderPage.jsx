import React from 'react';
import { useTranslation } from 'react-i18next';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ titleKey }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-nms-surface border border-nms-border flex items-center justify-center mb-4">
        <Construction size={28} className="text-nms-text-muted" />
      </div>
      <h2 className="text-section-title text-nms-text mb-2">{t(titleKey)}</h2>
      <p className="text-sm text-nms-text-muted text-center max-w-md">
        {t('common.loading') === 'Đang tải...'
          ? 'Tính năng này đang được phát triển. Vui lòng quay lại sau.'
          : 'This feature is under development. Please check back later.'}
      </p>
    </div>
  );
}
