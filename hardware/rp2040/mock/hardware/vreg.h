#ifndef MOCK_VREG_H
#define MOCK_VREG_H
enum vreg_voltage { VREG_VOLTAGE_1_10 = 0xb, VREG_VOLTAGE_1_20 = 0xd };
void vreg_set_voltage(enum vreg_voltage voltage);
#endif
