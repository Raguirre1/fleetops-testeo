import React from "react";
import logoFleetOps from "../assets/logo1_transparente.svg";

const LogoFleetOps = ({ height = 64, style = {} }) => (
  <img
    src={logoFleetOps}
    alt="FleetOps logo"
    className="logo-fleetops"
    style={{ height, width: "auto", ...style }}
  />
);

export default LogoFleetOps;
