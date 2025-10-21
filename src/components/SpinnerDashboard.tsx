"use client";

import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

export default function SpinnerDashboard({ tip = "Carregando..." }: { tip?: string }) {
  return (
    <div style={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <Spin
        tip={tip}
        indicator={
          <LoadingOutlined
            style={{ fontSize: 32, color: "#52c41a" }} // verde institucional
            spin
          />
        }
      />
    </div>
  );
}
