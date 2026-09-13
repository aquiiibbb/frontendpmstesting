import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrowserRouter } from "react-router-dom";
import ConfigurationPanel from "../pages/ConfigurationPanel";

describe("ConfigurationPanel Component", () => {
  it("renders ConfigurationPanel and clicks on Rooms sub-tab without throwing error", () => {
    render(
      <BrowserRouter>
        <ConfigurationPanel />
      </BrowserRouter>
    );

    const roomsBtn = screen.getByText("• Rooms");
    expect(roomsBtn).toBeDefined();

    // Click on Rooms tab
    fireEvent.click(roomsBtn);

    // Verify Manage Rooms header appears
    expect(screen.getByText("Manage Rooms")).toBeDefined();
  });
});
