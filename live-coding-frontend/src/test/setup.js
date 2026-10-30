import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Tiap tes mulai dari DOM bersih supaya urutan tes tidak saling memengaruhi.
afterEach(cleanup);
