import React, { useState } from 'react';
import { View } from 'react-native';
import { Chip, Screen } from '../../src/components/ui';
import PurchasePanel from '../../src/components/purchases/PurchasePanel';
import SupplierPanel from '../../src/components/purchases/SupplierPanel';

const TABS = [
  { key: 'nota', label: 'Nota pembelian' },
  { key: 'supplier', label: 'Supplier' },
];

export default function PembelianScreen() {
  const [tab, setTab] = useState('nota');

  return (
    <Screen title="Pembelian" subtitle="Catat barang yang dipesan atau datang. Supplier boleh dikosongkan.">
      <View style={{ flexDirection: 'row', marginBottom: 14 }}>
        {TABS.map((t) => (
          <Chip key={t.key} label={t.label} active={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </View>
      {tab === 'nota' ? <PurchasePanel /> : <SupplierPanel />}
    </Screen>
  );
}
